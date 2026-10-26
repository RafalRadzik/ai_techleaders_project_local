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
const { default: MentorLayout } = await import('./layout');
const { default: MentorHomePage } = await import('./mentor/page');

const denied = new Error('REDIRECT sentinel');

beforeEach(() => {
  vi.mocked(requirePageRole).mockReset();
  vi.mocked(requirePageUser).mockReset();
});

describe('(mentor)/layout', () => {
  it('guards for mentor, then renders AppShell with the mentor nav, name and sign-out', async () => {
    vi.mocked(requirePageRole).mockResolvedValue({ userId: 'u1', roles: ['mentor'] });
    vi.mocked(requirePageUser).mockResolvedValue({
      session: { userId: 'u1', roles: ['mentor'] },
      user: { displayName: 'Mock Mentor' } as never,
    });
    const child = <p>page</p>;
    const tree = await MentorLayout({ children: child });
    expect(requirePageRole).toHaveBeenCalledWith('mentor', '/mentor');
    expect(requirePageUser).toHaveBeenCalledWith('mentor', '/mentor');
    expect(tree.type).toBe(AppShell);
    expect(tree.props.user).toEqual({ displayName: 'Mock Mentor' });
    expect(tree.props.nav.type).toBe(NavLinks);
    expect(tree.props.nav.props.items).toEqual([{ href: '/mentor', label: 'Mentor workspace' }]);
    expect(tree.props.actions.type).toBe(SignOutButton);
    expect(tree.props.children).toBe(child);
  });

  it('renders nothing when the guard redirects', async () => {
    vi.mocked(requirePageRole).mockRejectedValue(denied);
    await expect(MentorLayout({ children: <p>page</p> })).rejects.toBe(denied);
    expect(requirePageUser).not.toHaveBeenCalled();
  });
});

describe('(mentor)/mentor/page', () => {
  it('greets the mentor by display name above an empty state', async () => {
    vi.mocked(requirePageUser).mockResolvedValue({
      session: { userId: 'u1', roles: ['mentor'] },
      user: { displayName: 'Mock Mentor' } as never,
    });
    const tree = await MentorHomePage();
    expect(requirePageUser).toHaveBeenCalledWith('mentor', '/mentor');
    expect(textOf(findByType(tree, 'h1')[0])).toBe('Welcome, Mock Mentor');
    expect(findByType(tree, EmptyState)[0]!.props.title).toBe('Nothing to manage yet');
  });

  it('renders nothing when the guard redirects', async () => {
    vi.mocked(requirePageUser).mockRejectedValue(denied);
    await expect(MentorHomePage()).rejects.toBe(denied);
  });
});
