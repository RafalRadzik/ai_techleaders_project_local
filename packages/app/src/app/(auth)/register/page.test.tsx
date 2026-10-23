import { AuthLayout } from '@devmentor/ui/backend';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findByType } from '../../../test/element-tree';
import type { SignInSearchParams } from '../sign-in/sign-in-notices';
import { RegisterForm } from './RegisterForm';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

vi.mock('../../../lib/session', () => ({
  getPageSession: vi.fn(),
  homeFor: vi.fn(() => '/role-home'),
}));

const { getPageSession, homeFor } = await import('../../../lib/session');
const page = await import('./page');

async function renderPage(params: SignInSearchParams = {}) {
  return page.default({ searchParams: Promise.resolve(params) });
}

beforeEach(() => {
  vi.mocked(getPageSession).mockReset().mockResolvedValue(null);
  vi.mocked(homeFor).mockClear();
});

describe('/register', () => {
  it('is force-dynamic', () => {
    expect(page.dynamic).toBe('force-dynamic');
  });

  it('sends a visitor who already holds a live session to their own home', async () => {
    vi.mocked(getPageSession).mockResolvedValue({ userId: 'u1', roles: ['mentee'] });
    await expect(renderPage()).rejects.toThrow('REDIRECT /role-home');
    expect(homeFor).toHaveBeenCalledWith(['mentee']);
  });

  it('renders the registration form inside the auth layout', async () => {
    const tree = await renderPage();
    const [layout] = findByType(tree, AuthLayout);
    expect(layout!.props.title).toBe('Create your account');
    expect((layout!.props.footer as React.ReactElement<{ href: string }>).props.href).toBe('/');
    expect(findByType(tree, RegisterForm)[0]!.props).toEqual({
      returnTo: '',
      githubHref: '/api/auth/github',
      signInHref: '/sign-in',
    });
  });

  it('carries a safe returnTo to the form and both sign-in links, and drops an unsafe one', async () => {
    const safe = findByType(await renderPage({ returnTo: ['/mentors', '/x'] }), RegisterForm)[0]!;
    expect(safe.props).toEqual({
      returnTo: '/mentors',
      githubHref: '/api/auth/github?returnTo=%2Fmentors',
      signInHref: '/sign-in?returnTo=%2Fmentors',
    });
    const unsafe = findByType(await renderPage({ returnTo: '//evil.example' }), RegisterForm)[0]!;
    expect(unsafe.props.returnTo).toBe('');
  });
});
