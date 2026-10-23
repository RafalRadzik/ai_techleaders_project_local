import { Card } from '@devmentor/ui';
import Link from 'next/link';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignOutButton } from '../../components/auth/SignOutButton';
import { allElements, findByType, textOf } from '../../test/element-tree';
import { UsersTable } from './users/UsersTable';

vi.mock('../../lib/session', () => ({ requirePageRole: vi.fn() }));
vi.mock('@devmentor/core', () => ({
  getEnv: vi.fn(() => ({ APP_NAME: 'DevMentor', NODE_ENV: 'production' })),
  checkDbConnection: vi.fn(),
}));

const { requirePageRole } = await import('../../lib/session');
const { checkDbConnection } = await import('@devmentor/core');
const { default: AdminLayout } = await import('./layout');
const { default: AdminDashboard } = await import('./page');
const { default: UsersPage } = await import('./users/page');

const operator = { userId: 'op', roles: ['mentor', 'operator'] } as const;
const denied = new Error('REDIRECT sentinel');

beforeEach(() => {
  vi.mocked(requirePageRole).mockReset().mockResolvedValue(operator);
  vi.mocked(checkDbConnection).mockReset();
});

describe('admin/layout', () => {
  it('guards for operator, then keeps the chrome: nav with "Users" plus sign-out', async () => {
    const child = <p>page</p>;
    const tree = await AdminLayout({ children: child });
    expect(requirePageRole).toHaveBeenCalledWith('operator', '/admin');
    const links = findByType(tree, Link).map((link) => [textOf(link), link.props.href]);
    expect(links).toEqual([
      ['DevMentor', '/'],
      ['Dashboard', '/admin'],
      ['Users', '/admin/users'],
    ]);
    expect(findByType(tree, SignOutButton)).toHaveLength(1);
    expect(findByType(tree, 'main')[0]!.props.children).toBe(child);
  });

  it('renders nothing when the guard redirects', async () => {
    vi.mocked(requirePageRole).mockRejectedValue(denied);
    await expect(AdminLayout({ children: <p>page</p> })).rejects.toBe(denied);
  });
});

describe('admin/page', () => {
  it.each([
    [true, 'Connected'],
    [false, 'Unavailable'],
  ])('guards, then shows the dashboard (database ok=%s)', async (ok, status) => {
    vi.mocked(checkDbConnection).mockResolvedValue({ ok } as never);
    const tree = await AdminDashboard();
    expect(requirePageRole).toHaveBeenCalledWith('operator', '/admin');
    expect(textOf(findByType(tree, 'h1')[0])).toBe('Dashboard');
    expect(findByType(tree, Card)).toHaveLength(2);
    expect(allElements(tree).map(textOf)).toContain(status);
  });

  it('checks nothing when the guard redirects', async () => {
    vi.mocked(requirePageRole).mockRejectedValue(denied);
    await expect(AdminDashboard()).rejects.toBe(denied);
    expect(checkDbConnection).not.toHaveBeenCalled();
  });
});

describe('admin/users/page', () => {
  it('guards for operator, then renders the users table', async () => {
    const tree = await UsersPage();
    expect(requirePageRole).toHaveBeenCalledWith('operator', '/admin/users');
    expect(tree.type).toBe(UsersTable);
  });

  it('renders nothing when the guard redirects', async () => {
    vi.mocked(requirePageRole).mockRejectedValue(denied);
    await expect(UsersPage()).rejects.toBe(denied);
  });
});
