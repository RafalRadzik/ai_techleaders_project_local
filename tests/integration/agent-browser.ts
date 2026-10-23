import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const cliPath = resolve('node_modules/agent-browser/bin/agent-browser.js');

export const integrationArtifactsDirectory = resolve('test-results/integration');

export async function runAgentBrowser(
  session: string,
  ...args: string[]
): Promise<string> {
  const { stdout } = await execFileAsync(
    process.execPath,
    [cliPath, '--session', session, ...args],
    {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60_000,
    },
  );
  return stdout.trim();
}

export async function closeAgentBrowser(session: string): Promise<void> {
  try {
    await runAgentBrowser(session, 'close');
  } catch {
    // Cleanup is best-effort; the original test/setup failure remains authoritative.
  }
}

export async function captureBrowserFailure(
  session: string,
  artifactPrefix: string,
): Promise<void> {
  await mkdir(integrationArtifactsDirectory, { recursive: true });
  const outputs: string[] = [];

  for (const [label, command] of [
    ['errors', ['errors']],
    ['console', ['console']],
  ] as const) {
    try {
      outputs.push(`${label}:\n${await runAgentBrowser(session, ...command)}`);
    } catch (error) {
      outputs.push(`${label}: unable to collect (${String(error)})`);
    }
  }

  try {
    await runAgentBrowser(
      session,
      'screenshot',
      resolve(integrationArtifactsDirectory, `${artifactPrefix}-failure.png`),
      '--full',
    );
  } catch (error) {
    outputs.push(`screenshot: unable to collect (${String(error)})`);
  }

  await writeFile(
    resolve(integrationArtifactsDirectory, `${artifactPrefix}-diagnostics.txt`),
    `${outputs.join('\n\n')}\n`,
    'utf8',
  );
}

/** The session cookie core issues (`SESSION_COOKIE_NAME`). */
export const SESSION_COOKIE_NAME = 'devmentor_session';

export interface BrowserCookie {
  name: string;
  value: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
}

/** The cookies the browser holds for the current page, read through agent-browser. */
export async function browserCookies(session: string): Promise<BrowserCookie[]> {
  const output = await runAgentBrowser(session, '--json', 'cookies', 'get');
  const parsed = JSON.parse(output) as { data?: { cookies?: BrowserCookie[] } };
  return parsed.data?.cookies ?? [];
}

/** The path and query of the page the browser is on. */
export async function currentPath(session: string): Promise<string> {
  const url = new URL(await runAgentBrowser(session, 'get', 'url'));
  return `${url.pathname}${url.search}`;
}

export interface SignedIn {
  /** Where the sign-in redirect chain landed, e.g. `/home`. */
  landingPath: string;
  /** The stored session cookie's value, for API calls made outside the browser. */
  sessionCookie: string;
}

/**
 * Sign in as a mock GitHub persona: the mock identity adapter derives the whole identity
 * from `login` (`<login>@devmentor.test`), so a seeded fixture with that address is
 * matched. Navigates the real start route, follows the redirects to the role home, and
 * asserts the session cookie was **stored** with its `Secure` and `HttpOnly` flags.
 * Load-bearing (spec edge case 32): the harness serves production over plain-HTTP
 * loopback, and a `Secure` cookie is kept only because Chrome trusts loopback origins.
 */
export async function signInAs(
  session: string,
  baseUrl: string,
  login: string,
): Promise<SignedIn> {
  await runAgentBrowser(
    session,
    'open',
    `${baseUrl}/api/auth/github?login=${encodeURIComponent(login)}`,
  );
  await runAgentBrowser(session, 'wait', '--load', 'load');
  const landingPath = await currentPath(session);
  const cookie = (await browserCookies(session)).find(
    (candidate) => candidate.name === SESSION_COOKIE_NAME,
  );
  if (!cookie) {
    throw new Error(
      `Signing in as ${login} stored no ${SESSION_COOKIE_NAME} cookie (landed on ${landingPath})`,
    );
  }
  if (!cookie.secure || !cookie.httpOnly) {
    throw new Error(
      `${SESSION_COOKIE_NAME} was stored without Secure/HttpOnly: ${JSON.stringify({ ...cookie, value: '<redacted>' })}`,
    );
  }
  return { landingPath, sessionCookie: cookie.value };
}

/** Request headers that carry a stored session to the app from Node (`fetch`). */
export function sessionCookieHeader(sessionCookie: string): Record<string, string> {
  return { cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}` };
}
