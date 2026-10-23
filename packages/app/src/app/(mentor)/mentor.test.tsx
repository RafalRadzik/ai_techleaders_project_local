import { EmptyState } from '@devmentor/ui/backend';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignedInFrame } from '../../components/shell/SignedInFrame';
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
  it('guards for mentor, then renders the mentor frame around the page', async () => {
    vi.mocked(requirePageRole).mockResolvedValue({ userId: 'u1', roles: ['mentor'] });
    const child = <p>page</p>;
    const tree = await MentorLayout({ children: child });
    expect(requirePageRole).toHaveBeenCalledWith('mentor', '/mentor');
    expect(tree.type).toBe(SignedInFrame);
    expect(tree.props).toEqual({ surface: 'Mentor', children: child });
  });

  it('renders nothing when the guard redirects', async () => {
    vi.mocked(requirePageRole).mockRejectedValue(denied);
    await expect(MentorLayout({ children: <p>page</p> })).rejects.toBe(denied);
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
