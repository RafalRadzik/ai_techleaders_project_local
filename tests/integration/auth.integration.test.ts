import { resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  browserCookies,
  captureBrowserFailure,
  closeAgentBrowser,
  currentPath,
  integrationArtifactsDirectory,
  runAgentBrowser,
  SESSION_COOKIE_NAME,
  sessionCookieHeader,
  signInAs,
} from './agent-browser';

let sequence = 0;

/** A fresh, isolated agent-browser session per scenario, closed in `finally`. */
async function inBrowser(
  label: string,
  scenario: (session: string, baseUrl: string) => Promise<void>,
): Promise<void> {
  const baseUrl = inject('integrationBaseUrl');
  sequence += 1;
  const session = `devmentor-auth-${label}-${process.pid}-${sequence}`;
  try {
    await scenario(session, baseUrl);
  } catch (error) {
    await captureBrowserFailure(session, `auth-${label}`);
    throw error;
  } finally {
    await closeAgentBrowser(session);
  }
}

async function screenshot(session: string, name: string): Promise<void> {
  await runAgentBrowser(
    session,
    'screenshot',
    resolve(integrationArtifactsDirectory, `${name}.png`),
    '--full',
  );
}

/** Every user's email, read through the operator-only API with an operator's cookie. */
async function userEmails(baseUrl: string, operatorCookie: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/api/users`, {
    headers: sessionCookieHeader(operatorCookie),
  });
  const payload = (await response.json()) as { ok: boolean; data?: { email: string }[] };
  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  return (payload.data ?? []).map((user) => user.email).sort();
}

describe('TC-AUTH-001 GitHub sign-in through the mock identity adapter', () => {
  it('shows the cancelled notice and creates no account when authorisation is cancelled', async () => {
    let operatorCookie = '';
    await inBrowser('operator-count', async (session, baseUrl) => {
      operatorCookie = (await signInAs(session, baseUrl, 'mock-operator')).sessionCookie;
    });
    const baseUrl = inject('integrationBaseUrl');
    const before = await userEmails(baseUrl, operatorCookie);

    await inBrowser('cancelled', async (session) => {
      await runAgentBrowser(
        session,
        'open',
        `${baseUrl}/api/auth/github/callback?error=access_denied&error_description=denied`,
      );
      await runAgentBrowser(session, 'wait', '--text', 'Sign-in was cancelled.');
      expect(await currentPath(session)).toBe('/sign-in?cancelled=1');

      const snapshot = await runAgentBrowser(session, 'snapshot');
      expect(snapshot).toContain('heading "Sign in"');
      expect(snapshot).toMatch(/alert[\s\S]*Sign-in was cancelled\. No account was created\./);
      expect(snapshot).toContain('link "Sign in with GitHub"');
      expect(snapshot.indexOf('link "Sign in with GitHub"')).toBeLessThan(
        snapshot.indexOf('textbox "Email address"'),
      );
      const cookies = await browserCookies(session);
      expect(cookies.map((cookie) => cookie.name)).not.toContain(SESSION_COOKIE_NAME);
      await screenshot(session, 'auth-cancelled');
    });

    expect(await userEmails(baseUrl, operatorCookie)).toEqual(before);
  });

  it('lands mock-mentee on the mentee home', async () => {
    await inBrowser('mentee', async (session, baseUrl) => {
      const { landingPath } = await signInAs(session, baseUrl, 'mock-mentee');
      expect(landingPath).toBe('/home');
      await runAgentBrowser(session, 'wait', '--text', 'Welcome, Mock Mentee');

      const snapshot = await runAgentBrowser(session, 'snapshot');
      expect(snapshot).toContain('heading "Welcome, Mock Mentee"');
      expect(snapshot).toContain('No sessions yet');
      expect(snapshot).toContain('button "Sign out"');
      await screenshot(session, 'auth-mentee-home');
    });
  });

  it("lands the seeded mentor's login on the mentor home", async () => {
    await inBrowser('mentor', async (session, baseUrl) => {
      const { landingPath } = await signInAs(session, baseUrl, 'mock-mentor');
      expect(landingPath).toBe('/mentor');
      await runAgentBrowser(session, 'wait', '--text', 'Welcome, Mock Mentor');

      const snapshot = await runAgentBrowser(session, 'snapshot');
      expect(snapshot).toContain('heading "Welcome, Mock Mentor"');
      expect(snapshot).toContain('button "Sign out"');
      await screenshot(session, 'auth-mentor-home');
    });
  });

  it('lands mock-operator (mentor + operator) on /admin and admits it to /mentor too', async () => {
    await inBrowser('operator', async (session, baseUrl) => {
      const { landingPath } = await signInAs(session, baseUrl, 'mock-operator');
      expect(landingPath).toBe('/admin');
      await runAgentBrowser(session, 'wait', '--text', 'Connected');

      const admin = await runAgentBrowser(session, 'snapshot');
      expect(admin).toContain('heading "Dashboard"');
      expect(admin).toContain('link "Users"');
      expect(admin).toContain('button "Sign out"');
      await screenshot(session, 'auth-operator-admin');

      await runAgentBrowser(session, 'open', `${baseUrl}/mentor`);
      await runAgentBrowser(session, 'wait', '--text', 'Welcome, Mock Operator');
      expect(await currentPath(session)).toBe('/mentor');
      expect(await runAgentBrowser(session, 'snapshot')).toContain(
        'heading "Welcome, Mock Operator"',
      );
      await screenshot(session, 'auth-operator-mentor');
    });
  });

  it('sends an expired session on a signed-in screen to sign-in and reveals nothing', async () => {
    await inBrowser('expired', async (session, baseUrl) => {
      const { landingPath, sessionCookie } = await signInAs(session, baseUrl, 'mock-mentee');
      expect(landingPath).toBe('/home');
      await runAgentBrowser(session, 'wait', '--text', 'Welcome, Mock Mentee');

      // Signing out bumps session_version, so the copied cookie is no longer live.
      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Sign out');
      await runAgentBrowser(session, 'wait', '--text', 'Grow faster with the right mentor.');
      expect(await currentPath(session)).toBe('/');

      await runAgentBrowser(
        session,
        'cookies',
        'set',
        SESSION_COOKIE_NAME,
        sessionCookie,
        '--url',
        baseUrl,
        '--httpOnly',
        '--secure',
        '--sameSite',
        'Lax',
      );
      await runAgentBrowser(session, 'open', `${baseUrl}/home`);
      await runAgentBrowser(session, 'wait', '--text', 'Sign in with GitHub');
      expect(await currentPath(session)).toBe('/sign-in?returnTo=%2Fhome');

      const snapshot = await runAgentBrowser(session, 'snapshot');
      expect(snapshot).toContain('heading "Sign in"');
      expect(snapshot).not.toContain('Mock Mentee');
      expect(await runAgentBrowser(session, 'get', 'text', 'body')).not.toContain('Mock Mentee');
      await screenshot(session, 'auth-expired-session');
    });
  });
});
