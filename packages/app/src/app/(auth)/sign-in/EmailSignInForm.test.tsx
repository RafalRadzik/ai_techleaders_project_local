// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailSignInForm, LOGIN_ENDPOINT, signInErrorCopy } from './EmailSignInForm';

const assign = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

async function signIn(email = 'ada@example.com', password = 'wrong password') {
  await userEvent.type(screen.getByLabelText(/Email address/), email);
  await userEvent.type(screen.getByLabelText(/Password/), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

function sentBody(): unknown {
  return JSON.parse(String(fetchMock.mock.calls[0]![1]!.body));
}

beforeEach(() => {
  assign.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('location', { ...window.location, assign });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EmailSignInForm', () => {
  it('labels both fields, masks the password and posts JSON with the CSRF header', async () => {
    respond({ ok: true, data: { id: 'u1', landingPath: '/home' } });
    render(<EmailSignInForm returnTo="" />);
    expect(screen.getByRole('group', { name: 'Sign in with email' })).toBeTruthy();
    const password = screen.getByLabelText<HTMLInputElement>(/Password/);
    expect(password.type).toBe('password');
    expect(password.autocomplete).toBe('current-password');
    expect(screen.getByLabelText<HTMLInputElement>(/Email address/).autocomplete).toBe('email');

    await signIn('Ada@Example.com ', 'correct horse battery');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(LOGIN_ENDPOINT);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['x-devmentor-request']).toBe('1');
    expect(sentBody()).toEqual({ email: 'ada@example.com', password: 'correct horse battery' });
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/home'));
  });

  it('sends the safe returnTo and follows the landing path the server chose', async () => {
    respond({ ok: true, data: { id: 'u1', landingPath: '/mentors' } });
    render(<EmailSignInForm returnTo="/mentors" />);
    await signIn();
    expect(sentBody()).toMatchObject({ returnTo: '/mentors' });
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/mentors'));
  });

  it('shows the generic message on a 401, keeps the entries and does not navigate', async () => {
    respond({ ok: false, error: { code: 'unauthorized', message: 'Invalid credentials' } }, 401);
    render(<EmailSignInForm returnTo="" />);
    await signIn();
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Invalid credentials. Check your email address and password, then try again.',
    );
    expect(screen.getByLabelText<HTMLInputElement>(/Email address/).value).toBe('ada@example.com');
    expect(assign).not.toHaveBeenCalled();
  });

  it('keeps the server reason for an unverified email', async () => {
    const message = 'Confirm your email address first. Open the link in the email we sent you, then sign in.';
    respond({ ok: false, error: { code: 'forbidden', message } }, 403);
    render(<EmailSignInForm returnTo="" />);
    await signIn();
    expect((await screen.findByRole('alert')).textContent).toBe(message);
  });

  it('validates on the client before any request', async () => {
    render(<EmailSignInForm returnTo="" />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('signInErrorCopy', () => {
  it('words the rate limit with the wait and the unavailable case plainly', () => {
    expect(signInErrorCopy({ code: 'rate_limited', message: 'x', retryAfterSeconds: 840 })).toBe(
      'Too many sign-in attempts. Wait 14 minutes, then try again.',
    );
    expect(signInErrorCopy({ code: 'service_unavailable', message: 'x' })).toBe(
      'Sign-in is unavailable right now. Try again in a few minutes.',
    );
    expect(signInErrorCopy({ code: 'forbidden', message: 'x' })).toBeUndefined();
  });
});
