// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyEmailForm, verificationErrorCopy } from './VerifyEmailForm';

const fetchMock = vi.fn<typeof fetch>();
const assign = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  assign.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('location', { ...window.location, assign });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('VerifyEmailForm', () => {
  it('posts the inbox owner password and token as CSRF-protected JSON, then follows the server landing', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      ok: true, data: { landingPath: '/mentors?stack=go' },
    })));
    render(<VerifyEmailForm token="emailed-token" />);
    expect(fetchMock).not.toHaveBeenCalled();
    const password = screen.getByLabelText<HTMLInputElement>(/Password/);
    expect(password.type).toBe('password');
    expect(password.autocomplete).toBe('new-password');
    expect(screen.getByText(/replaces the password entered during registration/)).toBeTruthy();
    await userEvent.type(password, 'different final password');
    await userEvent.click(screen.getByRole('button', { name: 'Set password and sign in' }));

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/verify-email');
    expect(init!.method).toBe('POST');
    expect((init!.headers as Record<string, string>)['x-devmentor-request']).toBe('1');
    expect(JSON.parse(String(init!.body))).toEqual({
      token: 'emailed-token',
      password: 'different final password',
    });
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/mentors?stack=go'));
  });

  it('validates the new password without a request', async () => {
    render(<VerifyEmailForm token="emailed-token" />);
    await userEvent.type(screen.getByLabelText(/Password/), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Set password and sign in' }));
    expect(await screen.findByText('Use a password of at least 12 characters.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('keeps the chosen password on failure and offers a plain link-recovery message', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      ok: false, error: { code: 'bad_request', message: 'Invalid or expired token' },
    }), { status: 400 }));
    render(<VerifyEmailForm token="consumed-token" />);
    await userEvent.type(screen.getByLabelText(/Password/), 'different final password');
    await userEvent.click(screen.getByRole('button', { name: 'Set password and sign in' }));
    expect((await screen.findByRole('alert')).textContent).toContain('invalid, expired, or already used');
    expect(screen.getByLabelText<HTMLInputElement>(/Password/).value).toBe('different final password');
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('verificationErrorCopy', () => {
  it('renders retry guidance for unavailable completion and preserves other server messages', () => {
    expect(verificationErrorCopy({ code: 'service_unavailable', message: 'x' }))
      .toBe('We could not finish confirming your email. Try again in a few minutes.');
    expect(verificationErrorCopy({ code: 'forbidden', message: 'No active role' })).toBeUndefined();
  });
});
