// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIGN_OUT_ENDPOINT, SignOutButton } from './SignOutButton';

const assign = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  assign.mockReset();
  fetchMock.mockReset();
  // jsdom's `location` is unforgeable, so the whole object is stubbed for the assertion.
  vi.stubGlobal('location', { ...window.location, assign });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SignOutButton', () => {
  it('POSTs the logout route with the CSRF header, then hard-navigates to /', async () => {
    let finish!: (res: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Signing out…' }).disabled).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(SIGN_OUT_ENDPOINT);
    expect(url).toBe('/api/auth/logout');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['x-devmentor-request']).toBe('1');
    expect(assign).not.toHaveBeenCalled();

    finish(new Response(JSON.stringify({ ok: true, data: null })));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('stays on the page and shows the envelope message when sign-out fails', async () => {
    respond({ ok: false, error: { code: 'forbidden', message: 'Missing x-devmentor-request header' } }, 403);
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Missing x-devmentor-request header');
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Sign out' }).disabled).toBe(false);
  });
});
