import { AppShell } from '@devmentor/ui/backend';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignOutButton } from '../auth/SignOutButton';
import { NavLinks } from './NavLinks';

vi.mock('../../lib/session', () => ({ requirePageUser: vi.fn() }));

const { requirePageUser } = await import('../../lib/session');
const { signedInShell } = await import('./signed-in-shell');

beforeEach(() => {
  vi.mocked(requirePageUser).mockReset();
});

describe('signedInShell', () => {
  it('wraps the page in AppShell with nav for every held role, the name and sign-out', async () => {
    vi.mocked(requirePageUser).mockResolvedValue({
      session: { userId: 'u1', roles: ['mentor', 'mentee'] },
      user: { displayName: 'Both Roles' } as never,
    });
    const child = <p>page</p>;
    const tree = await signedInShell('mentor', '/mentor', child);
    expect(requirePageUser).toHaveBeenCalledWith('mentor', '/mentor');
    expect(tree.type).toBe(AppShell);
    expect(tree.props.nav.type).toBe(NavLinks);
    expect(tree.props.nav.props.items.map((item: { href: string }) => item.href)).toEqual(['/home', '/mentor']);
    expect(tree.props.user).toEqual({ displayName: 'Both Roles' });
    expect(tree.props.actions.type).toBe(SignOutButton);
    expect(tree.props.children).toBe(child);
  });

  it('renders nothing when the session lapsed after the layout guard', async () => {
    const lapsed = new Error('REDIRECT sentinel');
    vi.mocked(requirePageUser).mockRejectedValue(lapsed);
    await expect(signedInShell('mentee', '/home', <p>page</p>)).rejects.toBe(lapsed);
  });
});
