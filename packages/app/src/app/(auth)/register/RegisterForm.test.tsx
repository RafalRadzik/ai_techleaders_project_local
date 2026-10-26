// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REGISTER_ENDPOINT, RegisterForm } from './RegisterForm';

const fetchMock = vi.fn<typeof fetch>();

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

const LINKS = { githubHref: '/api/auth/github?returnTo=%2Fmentors', signInHref: '/sign-in?returnTo=%2Fmentors' };

async function register(password = 'a long enough password') {
  await userEvent.type(screen.getByLabelText(/Display name/), 'Ada Lovelace');
  await userEvent.type(screen.getByLabelText(/Email address/), 'ada@example.com');
  await userEvent.type(screen.getByLabelText(/Password/), password);
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RegisterForm', () => {
  it('offers GitHub first, then labelled email fields with a masked new password', () => {
    render(<RegisterForm returnTo="" {...LINKS} />);
    const github = screen.getByRole('link', { name: 'Continue with GitHub' });
    expect(github.getAttribute('href')).toBe(LINKS.githubHref);
    const group = screen.getByRole('group', { name: 'Create an account with email' });
    expect(github.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const password = screen.getByLabelText<HTMLInputElement>(/Password/);
    expect(password.type).toBe('password');
    expect(password.autocomplete).toBe('new-password');
    expect(screen.getByText(/you will choose your final sign-in password/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe(LINKS.signInHref);
  });

  it('posts JSON with the CSRF header and the safe returnTo, then shows where the link went', async () => {
    respond({ ok: true, data: { email: 'ada@example.com' } });
    render(<RegisterForm returnTo="/mentors" {...LINKS} />);
    await register();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(REGISTER_ENDPOINT);
    expect((init?.headers as Record<string, string>)['x-devmentor-request']).toBe('1');
    expect(JSON.parse(String(init?.body))).toEqual({
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'a long enough password',
      returnTo: '/mentors',
    });

    const status = await screen.findByRole('status');
    expect(within(status).getByText('Check your inbox at ada@example.com')).toBeTruthy();
    expect(status.textContent).toContain('register again with the same address to get a new link');
    expect(status.textContent).toContain('then set your password to confirm your address and sign in');
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to sign in' }).getAttribute('href')).toBe(LINKS.signInHref);

    await userEvent.click(screen.getByRole('button', { name: 'Register again' }));
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });

  it('refuses a short password on the client before any request', async () => {
    render(<RegisterForm returnTo="" {...LINKS} />);
    await register('short');
    expect(await screen.findByText('Use a password of at least 12 characters.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a 409 with the server message and links to GitHub and email sign-in', async () => {
    const message = 'This address already has an account that signs in with GitHub. Use "Continue with GitHub" instead.';
    respond({ ok: false, error: { code: 'conflict', message } }, 409);
    render(<RegisterForm returnTo="" {...LINKS} />);
    await register();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(message)).toBeTruthy();
    expect(within(alert).getByRole('link', { name: 'Continue with GitHub' }).getAttribute('href')).toBe(LINKS.githubHref);
    expect(within(alert).getByRole('link', { name: 'Sign in with email' }).getAttribute('href')).toBe(LINKS.signInHref);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each([
    [{ code: 'rate_limited', message: 'x', retryAfterSeconds: 3600 }, 429,
      'Too many registration attempts from this network. Wait 60 minutes, then try again.'],
    [{ code: 'service_unavailable', message: 'x' }, 503,
      'We could not send your confirmation email, so your account is not ready yet. Try again in a few minutes. Your entries are still here.'],
    [{ code: 'internal_error', message: 'Something went wrong' }, 500, 'Something went wrong'],
  ])('words a %j failure', async (error, status, copy) => {
    respond({ ok: false, error }, status);
    render(<RegisterForm returnTo="" {...LINKS} />);
    await register();
    expect((await screen.findByRole('alert')).textContent).toBe(copy);
    expect(screen.getByLabelText<HTMLInputElement>(/Email address/).value).toBe('ada@example.com');
  });
});
