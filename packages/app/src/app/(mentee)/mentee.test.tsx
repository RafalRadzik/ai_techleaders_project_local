import { EmptyState } from '@devmentor/ui/backend';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignedInFrame } from '../../components/shell/SignedInFrame';
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
  it('guards for mentee, then renders the mentee frame around the page', async () => {
    vi.mocked(requirePageRole).mockResolvedValue({ userId: 'u1', roles: ['mentee'] });
    const child = <p>page</p>;
    const tree = await MenteeLayout({ children: child });
    expect(requirePageRole).toHaveBeenCalledWith('mentee', '/home');
    expect(tree.type).toBe(SignedInFrame);
    expect(tree.props).toEqual({ surface: 'Mentee', children: child });
  });

  it('renders nothing when the guard redirects', async () => {
    vi.mocked(requirePageRole).mockRejectedValue(denied);
    await expect(MenteeLayout({ children: <p>page</p> })).rejects.toBe(denied);
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
