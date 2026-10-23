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

  it('registers a new address, follows the emailed link and lands signed in on /home', async () => {
    const email = freshEmail('register');
    await inBrowser('register', async (session, baseUrl) => {
      const link = await registerAndCaptureLink(session, baseUrl, 'Grace Hopper', email);
      await screenshot(session, 'password-check-inbox');

      await runAgentBrowser(session, 'open', link);
      await runAgentBrowser(session, 'wait', '--text', 'Welcome, Grace Hopper');
      expect(await currentPath(session)).toBe('/home');
      const snapshot = await runAgentBrowser(session, 'snapshot');
      expect(snapshot).toContain('heading "Welcome, Grace Hopper"');
      expect(snapshot).toContain('button "Sign out"');
      expect(await hasSessionCookie(session)).toBe(true);
      await screenshot(session, 'password-verified-home');
    });
  });

  it('refuses sign-in before the email is verified, with the reason', async () => {
    const email = freshEmail('unverified');
    await inBrowser('unverified', async (session, baseUrl) => {
      await registerAndCaptureLink(session, baseUrl, 'Unverified User', email);

      await openSignIn(session, baseUrl);
      await submitSignIn(session, email, NEW_PASSWORD);
      await runAgentBrowser(session, 'wait', '--text', 'Confirm your email address first');

      expect(await runAgentBrowser(session, 'snapshot')).toMatch(
        /alert[\s\S]*Confirm your email address first\. Open the link in the email we sent you, then sign in\./,
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
