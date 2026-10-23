import { AppShell, EmptyState } from '@devmentor/ui/backend';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignOutButton } from '../../components/auth/SignOutButton';
import { NavLinks } from '../../components/shell/NavLinks';
import { findByType, textOf } from '../../test/element-tree';

vi.mock('../../lib/session', () => ({
  requirePageRole: vi.fn(),
  requirePageUser: vi.fn(),
}));

const { requirePageRole, requirePageUser } = await import('../../lib/session');
const { default: MenteeLayout } = await import('./layout');
const { default: MenteeHomePage } = await import('./home/page');

const denied = new Error('REDIRECT sentinel');

beforeEach(() => {
  vi.mocked(requirePageRole).mockReset();
  vi.mocked(requirePageUser).mockReset();
});

describe('(mentee)/layout', () => {
  it('guards for mentee, then renders AppShell with the mentee nav, name and sign-out', async () => {
    vi.mocked(requirePageRole).mockResolvedValue({ userId: 'u1', roles: ['mentee'] });
    vi.mocked(requirePageUser).mockResolvedValue({
      session: { userId: 'u1', roles: ['mentee'] },
      user: { displayName: 'Mock Mentee' } as never,
    });
    const child = <p>page</p>;
    const tree = await MenteeLayout({ children: child });
    expect(requirePageRole).toHaveBeenCalledWith('mentee', '/home');
    expect(requirePageUser).toHaveBeenCalledWith('mentee', '/home');
    expect(tree.type).toBe(AppShell);
    expect(tree.props.user).toEqual({ displayName: 'Mock Mentee' });
    expect(tree.props.nav.type).toBe(NavLinks);
    expect(tree.props.nav.props.items).toEqual([{ href: '/home', label: 'Home' }]);
    expect(tree.props.actions.type).toBe(SignOutButton);
    expect(tree.props.children).toBe(child);
  });

  it('renders nothing when the guard redirects', async () => {
    vi.mocked(requirePageRole).mockRejectedValue(denied);
    await expect(MenteeLayout({ children: <p>page</p> })).rejects.toBe(denied);
    expect(requirePageUser).not.toHaveBeenCalled();
  });
});

describe('(mentee)/home/page', () => {
  it('greets the mentee by display name above an empty state', async () => {
    vi.mocked(requirePageUser).mockResolvedValue({
      session: { userId: 'u1', roles: ['mentee'] },
      user: { displayName: 'Mock Mentee' } as never,
    });
    const tree = await MenteeHomePage();
    expect(requirePageUser).toHaveBeenCalledWith('mentee', '/home');
    expect(textOf(findByType(tree, 'h1')[0])).toBe('Welcome, Mock Mentee');
    expect(findByType(tree, EmptyState)[0]!.props.title).toBe('No sessions yet');
  });

  it('renders nothing when the guard redirects', async () => {
    vi.mocked(requirePageUser).mockRejectedValue(denied);
    await expect(MenteeHomePage()).rejects.toBe(denied);
  });
});
