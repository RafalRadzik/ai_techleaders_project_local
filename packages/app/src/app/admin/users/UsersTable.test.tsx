// @vitest-environment jsdom

import { apiCall } from '@devmentor/ui/backend';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersTable } from './UsersTable';

vi.mock('@devmentor/ui/backend', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiCall: vi.fn(),
}));

const request = vi.mocked(apiCall);

beforeEach(() => request.mockReset());
afterEach(cleanup);

describe('UsersTable', () => {
  it('fetches /api/users through apiCall and lists each user', async () => {
    request.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'u1',
          email: 'ada@devmentor.dev',
          displayName: 'Ada Lovelace',
          mentorProfile: { id: 'mp1', headline: 'Systems & algorithms mentor' },
        },
        { id: 'u2', email: 'mock-mentee@devmentor.test', displayName: 'Mock Mentee', mentorProfile: null },
      ],
    });
    render(<UsersTable />);

    expect(await screen.findByRole('cell', { name: 'Ada Lovelace' })).toBeTruthy();
    expect(request).toHaveBeenCalledWith('/api/users');
    expect(screen.getByRole('heading', { name: 'Users' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Systems & algorithms mentor' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '—' })).toBeTruthy();
  });

  it('shows the envelope error message', async () => {
    request.mockResolvedValue({
      ok: false,
      status: 403,
      error: { code: 'forbidden', message: 'You do not have access to this resource' },
    } as never);
    render(<UsersTable />);
    expect(await screen.findByText('You do not have access to this resource')).toBeTruthy();
  });

  it('ignores a response that arrives after unmounting', async () => {
    let finish!: (value: Awaited<ReturnType<typeof apiCall>>) => void;
    request.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { unmount } = render(<UsersTable />);
    unmount();
    finish({ ok: true, data: [] } as never);
    await Promise.resolve();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
