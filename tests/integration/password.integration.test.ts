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
  signInAs,
} from './agent-browser';
import { appLogOffset, waitForMail } from './mail';

const SEED_PASSWORD = 'devmentor-password';
const NEW_PASSWORD = 'correct horse battery staple';
const FINAL_PASSWORD = 'inbox owner final password';

let sequence = 0;

/** A fresh, isolated agent-browser session per scenario, closed in `finally`. */
async function inBrowser(
  label: string,
  scenario: (session: string, baseUrl: string) => Promise<void>,
): Promise<void> {
  const baseUrl = inject('integrationBaseUrl');
  sequence += 1;
  const session = `devmentor-password-${label}-${process.pid}-${sequence}`;
  try {
    await scenario(session, baseUrl);
  } catch (error) {
    await captureBrowserFailure(session, `password-${label}`);
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

/**
 * A never-used address per scenario: each test owns its rows and its per-email rate-limit
 * counters, so no scenario can trip a limit another one depends on.
 */
function freshEmail(label: string): string {
  return `${label}-${process.pid}-${Date.now()}@devmentor.test`;
}

async function hasSessionCookie(session: string): Promise<boolean> {
  return (await browserCookies(session)).some((cookie) => cookie.name === SESSION_COOKIE_NAME);
}

async function openSignIn(session: string, baseUrl: string): Promise<string> {
  await runAgentBrowser(session, 'open', `${baseUrl}/sign-in`);
  await runAgentBrowser(session, 'wait', '--text', 'Sign in with GitHub');
  const snapshot = await runAgentBrowser(session, 'snapshot');
  expect(snapshot).toContain('link "Sign in with GitHub"');
  expect(snapshot.indexOf('link "Sign in with GitHub"')).toBeLessThan(
    snapshot.indexOf('textbox "Email address'),
  );
  expect(snapshot).toContain('textbox "Password');
  expect(snapshot).toContain('link "Create an account"');
  return snapshot;
}

async function submitSignIn(session: string, email: string, password: string): Promise<void> {
  await runAgentBrowser(session, 'find', 'label', 'Email address', 'fill', email);
  await runAgentBrowser(session, 'find', 'label', 'Password', 'fill', password);
  await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Sign in', '--exact');
}

async function openRegister(session: string, baseUrl: string): Promise<void> {
  await runAgentBrowser(session, 'open', `${baseUrl}/register`);
  await runAgentBrowser(session, 'wait', '--text', 'Create your account');
  const snapshot = await runAgentBrowser(session, 'snapshot');
  expect(snapshot).toContain('heading "Create your account"');
  expect(snapshot.indexOf('link "Continue with GitHub"')).toBeGreaterThan(-1);
  expect(snapshot.indexOf('link "Continue with GitHub"')).toBeLessThan(
    snapshot.indexOf('textbox "Display name'),
  );
}

async function submitRegistration(
  session: string,
  displayName: string,
  email: string,
): Promise<void> {
  await runAgentBrowser(session, 'find', 'label', 'Display name', 'fill', displayName);
  await runAgentBrowser(session, 'find', 'label', 'Email address', 'fill', email);
  await runAgentBrowser(session, 'find', 'label', 'Password', 'fill', NEW_PASSWORD);
  await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Create account');
}

/** Register `email` in the browser and return the verification link the log mailer captured. */
async function registerAndCaptureLink(
  session: string,
  baseUrl: string,
  displayName: string,
  email: string,
): Promise<string> {
  await openRegister(session, baseUrl);
  const since = await appLogOffset();
  await submitRegistration(session, displayName, email);
  await runAgentBrowser(session, 'wait', '--text', `Check your inbox at ${email}`);
  expect(await runAgentBrowser(session, 'snapshot')).toMatch(
    new RegExp(`status[\\s\\S]*Check your inbox at ${email.replace(/[.]/g, '\\.')}`),
  );
  expect(await hasSessionCookie(session)).toBe(false);

  const mail = await waitForMail(email, { since });
  expect(mail.subject).toBe('Confirm your email address for DevMentor');
  const [link] = mail.text.match(/https?:\/\/\S+\/api\/auth\/verify-email\?token=\S+/) ?? [];
  expect(link, mail.text).toBeDefined();
  expect(new URL(link!).origin).toBe(new URL(baseUrl).origin);
  return link!;
}

async function completeEmail(session: string, link: string, password = FINAL_PASSWORD): Promise<void> {
  await runAgentBrowser(session, 'open', link);
  await runAgentBrowser(session, 'wait', '--text', 'Set your password');
  const snapshot = await runAgentBrowser(session, 'snapshot');
  expect(snapshot).toContain('heading "Set your password"');
  expect(snapshot).toContain('textbox "Password');
  expect(await currentPath(session)).toMatch(/^\/verify-email\?token=/);
  expect(await hasSessionCookie(session)).toBe(false);
  await screenshot(session, 'password-completion');
  await runAgentBrowser(session, 'find', 'label', 'Password', 'fill', password);
  await runAgentBrowser(
    session, 'find', 'role', 'button', 'click', '--name', 'Set password and sign in',
  );
}

async function postCompletion(baseUrl: string, token: string, password: string, csrf = true) {
  return fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(csrf ? { 'x-devmentor-request': '1' } : {}),
    },
    body: JSON.stringify({ token, password }),
  });
}

describe('TC-AUTH-004 email and password', () => {
  it('refuses a wrong password with the generic message and stores no session cookie', async () => {
    await inBrowser('wrong-password', async (session, baseUrl) => {
      await openSignIn(session, baseUrl);
      await submitSignIn(session, 'mock-mentee@devmentor.test', 'not-the-password');
      await runAgentBrowser(session, 'wait', '--text', 'Invalid credentials');

      const snapshot = await runAgentBrowser(session, 'snapshot');
      expect(snapshot).toMatch(
        /alert[\s\S]*Invalid credentials\. Check your email address and password, then try again\./,
      );
      expect(snapshot).not.toMatch(/no account|not registered|wrong password/i);
      expect(await currentPath(session)).toBe('/sign-in');
      expect(await hasSessionCookie(session)).toBe(false);
      await screenshot(session, 'password-wrong');
    });
  });

  it('signs mock-mentee in with the seeded password and lands on /home', async () => {
    await inBrowser('mentee', async (session, baseUrl) => {
      await openSignIn(session, baseUrl);
      await submitSignIn(session, 'mock-mentee@devmentor.test', SEED_PASSWORD);
      await runAgentBrowser(session, 'wait', '--url', '**/home');
      await runAgentBrowser(session, 'wait', '--text', 'Welcome, Mock Mentee');

      expect(await currentPath(session)).toBe('/home');
      const cookie = (await browserCookies(session)).find(
        (candidate) => candidate.name === SESSION_COOKIE_NAME,
      );
      expect(cookie).toMatchObject({ secure: true, httpOnly: true });
      expect(await runAgentBrowser(session, 'snapshot')).toContain('button "Sign out"');
      await screenshot(session, 'password-mentee-home');
    });
  });

  it('GET alone cannot activate a registrant password; the inbox owner chooses a different password', async () => {
    const email = freshEmail('register');
    await inBrowser('register', async (session, baseUrl) => {
      const link = await registerAndCaptureLink(session, baseUrl, 'Grace Hopper', email);
      await screenshot(session, 'password-check-inbox');

      const firstGet = await fetch(link, { redirect: 'manual' });
      const secondGet = await fetch(link, { redirect: 'manual' });
      expect(firstGet.status).toBe(302);
      expect(secondGet.headers.get('location')).toBe(firstGet.headers.get('location'));
      expect(firstGet.headers.getSetCookie()).toEqual([]);
      expect(secondGet.headers.getSetCookie()).toEqual([]);

      // A mail scanner and an inbox owner's GET both leave the claim unverified.
      await openSignIn(session, baseUrl);
      await submitSignIn(session, email, NEW_PASSWORD);
      await runAgentBrowser(session, 'wait', '--text', 'Confirm your email address first');
      expect(await hasSessionCookie(session)).toBe(false);

      await completeEmail(session, link);
      await runAgentBrowser(session, 'wait', '--text', 'Welcome, Grace Hopper');
      expect(await currentPath(session)).toBe('/home');
      const snapshot = await runAgentBrowser(session, 'snapshot');
      expect(snapshot).toContain('heading "Welcome, Grace Hopper"');
      expect(snapshot).toContain('button "Sign out"');
      expect(await hasSessionCookie(session)).toBe(true);
      await screenshot(session, 'password-verified-home');

      const token = new URL(link).searchParams.get('token')!;
      const replay = await postCompletion(baseUrl, token, 'attacker replay password');
      expect(replay.status).toBe(400);
      expect(replay.headers.getSetCookie()).toEqual([]);

      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Sign out');
      await openSignIn(session, baseUrl);
      await submitSignIn(session, email, NEW_PASSWORD);
      await runAgentBrowser(session, 'wait', '--text', 'Invalid credentials');
      expect(await hasSessionCookie(session)).toBe(false);
      await submitSignIn(session, email, FINAL_PASSWORD);
      await runAgentBrowser(session, 'wait', '--text', 'Welcome, Grace Hopper');
      expect(await currentPath(session)).toBe('/home');
    });
  });

  it('rejects CSRF, malformed, wrong and superseded completion without activating the claim', async () => {
    const email = freshEmail('superseded');
    await inBrowser('superseded', async (session, baseUrl) => {
      const oldLink = await registerAndCaptureLink(session, baseUrl, 'Fresh Claim', email);
      const oldToken = new URL(oldLink).searchParams.get('token')!;
      const newLink = await registerAndCaptureLink(session, baseUrl, 'Inbox Owner', email);
      const token = new URL(newLink).searchParams.get('token')!;
      for (const [candidate, password, csrf, expected] of [
        [token, FINAL_PASSWORD, false, 403],
        [token, 'short', true, 422],
        ['not-a-token', FINAL_PASSWORD, true, 400],
        [oldToken, FINAL_PASSWORD, true, 400],
      ] as const) {
        const response = await postCompletion(baseUrl, candidate, password, csrf);
        expect(response.status).toBe(expected);
        expect(response.headers.getSetCookie()).toEqual([]);
      }
      await openSignIn(session, baseUrl);
      await submitSignIn(session, email, NEW_PASSWORD);
      await runAgentBrowser(session, 'wait', '--text', 'Confirm your email address first');
      expect(await hasSessionCookie(session)).toBe(false);

      // Concurrent completion requests serialize at the user row: only one may consume it.
      const results = await Promise.all([
        postCompletion(baseUrl, token, FINAL_PASSWORD),
        postCompletion(baseUrl, token, FINAL_PASSWORD),
      ]);
      expect(results.map((response) => response.status).sort()).toEqual([200, 400]);
      expect(results.find((response) => response.status === 400)!.headers.getSetCookie()).toEqual([]);
      expect(await results.find((response) => response.status === 200)!.json()).toEqual({
        ok: true, data: { landingPath: '/home' },
      });
      await submitSignIn(session, email, FINAL_PASSWORD);
      await runAgentBrowser(session, 'wait', '--text', 'Welcome, Inbox Owner');
      expect(await currentPath(session)).toBe('/home');
    });
  });

  it.each([
    ['/home?from=confirmation#inbox', '/home?from=confirmation#inbox'],
    ['//external.example', '/home'],
  ])('preserves only safe returnTo through registration, mail and completion (%s)', async (returnTo, landingPath) => {
    const baseUrl = inject('integrationBaseUrl');
    const email = freshEmail('return-to');
    const since = await appLogOffset();
    const registration = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-devmentor-request': '1' },
      body: JSON.stringify({
        email, password: NEW_PASSWORD, displayName: 'Return Path Owner', returnTo,
      }),
    });
    expect(registration.status).toBe(200);
    expect(registration.headers.getSetCookie()).toEqual([]);
    const mail = await waitForMail(email, { since });
    const [link] = mail.text.match(/https?:\/\/\S+\/api\/auth\/verify-email\?token=\S+/) ?? [];
    const response = await postCompletion(
      baseUrl, new URL(link!).searchParams.get('token')!, FINAL_PASSWORD,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { landingPath } });
    expect(response.headers.getSetCookie()).toHaveLength(1);
  });

  it('refuses sign-in before the email is verified, with the reason', async () => {
    const email = freshEmail('unverified');
    await inBrowser('unverified', async (session, baseUrl) => {
      await registerAndCaptureLink(session, baseUrl, 'Unverified User', email);

      await openSignIn(session, baseUrl);
      await submitSignIn(session, email, NEW_PASSWORD);
      await runAgentBrowser(session, 'wait', '--text', 'Confirm your email address first');

      expect(await runAgentBrowser(session, 'snapshot')).toMatch(
        /alert[\s\S]*Confirm your email address first\. Open the link in the email we sent you and set your password\./,
      );
      expect(await currentPath(session)).toBe('/sign-in');
      expect(await hasSessionCookie(session)).toBe(false);
      await screenshot(session, 'password-unverified');
    });
  });

  it('refuses to register an address tied to GitHub and points to GitHub sign-in', async () => {
    // Linking first makes the row GitHub-tied whatever order the suite's files run in.
    await inBrowser('link-mentor', async (session, baseUrl) => {
      await signInAs(session, baseUrl, 'mock-mentor');
    });

    await inBrowser('github-conflict', async (session, baseUrl) => {
      await openRegister(session, baseUrl);
      await submitRegistration(session, 'Someone Else', 'mock-mentor@devmentor.test');
      await runAgentBrowser(session, 'wait', '--text', 'signs in with GitHub');

      const snapshot = await runAgentBrowser(session, 'snapshot');
      expect(snapshot).toMatch(/alert[\s\S]*This address already has an account that signs in with GitHub/);
      const alert = snapshot.slice(snapshot.indexOf('alert'));
      expect(alert).toContain('link "Continue with GitHub"');
      expect(alert).toContain('link "Sign in with email"');
      expect(snapshot).not.toContain('Check your inbox');
      expect(await hasSessionCookie(session)).toBe(false);
      await screenshot(session, 'password-github-conflict');
    });
  });
});
