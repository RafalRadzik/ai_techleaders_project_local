import Link from 'next/link';
import { Button } from '@devmentor/ui';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allElements, findByType, textOf } from '../../../test/element-tree';
import { EmailSignInForm } from './EmailSignInForm';
import { SIGN_IN_NOTICES, type SignInSearchParams } from './sign-in-notices';

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
const { default: SignInPage } = await import('./page');

async function renderPage(params: SignInSearchParams = {}) {
  return SignInPage({ searchParams: Promise.resolve(params) });
}

function githubLink(tree: Awaited<ReturnType<typeof renderPage>>) {
  const [button] = findByType(tree, Button);
  const anchor = button!.props.children as React.ReactElement<{ href: string; children: string }>;
  return anchor;
}

function notices(tree: Awaited<ReturnType<typeof renderPage>>): string[] {
  return findByType(tree, ErrorMessage).map((element) => element.props.message as string);
}

beforeEach(() => {
  vi.mocked(getPageSession).mockReset().mockResolvedValue(null);
  vi.mocked(homeFor).mockClear();
});

describe('/sign-in', () => {
  it('redirects a visitor who already holds a live session to their own home (edge case 28)', async () => {
    vi.mocked(getPageSession).mockResolvedValue({ userId: 'u1', roles: ['mentor', 'operator'] });
    await expect(renderPage({ returnTo: '/home' })).rejects.toThrow('REDIRECT /role-home');
    expect(homeFor).toHaveBeenCalledWith(['mentor', 'operator']);
  });

  it('offers GitHub first as a plain link, then the email form, then a way to register', async () => {
    const tree = await renderPage();
    const [layout] = findByType(tree, AuthLayout);
    expect(layout!.props.title).toBe('Sign in');

    const anchor = githubLink(tree);
    expect(anchor.type).toBe('a');
    expect(anchor.props.href).toBe('/api/auth/github');
    expect(anchor.props.children).toBe('Sign in with GitHub');

    const elements = allElements(tree);
    const [form] = findByType(tree, EmailSignInForm);
    expect(form!.props).toEqual({ returnTo: '' });
    expect(elements.indexOf(anchor)).toBeLessThan(elements.indexOf(form!));

    const [register] = findByType(tree, Link).filter((link) => link.props.href !== '/');
    expect(register!.props.href).toBe('/register');
    expect(textOf(register)).toBe('Create an account');
    expect(elements.indexOf(form!)).toBeLessThan(elements.indexOf(register!));

    expect(notices(tree)).toEqual([]);
    const footerLink = layout!.props.footer as React.ReactElement<{ href: string }>;
    expect(footerLink.props.href).toBe('/');
  });

  it('points an expired or invalid verification link to registering again', async () => {
    const [notice] = notices(await renderPage({ error: 'verification' }));
    expect(notice).toContain('Register again with the same email address');
  });

  it('shows the cancelled notice (edge case 2)', async () => {
    expect(notices(await renderPage({ cancelled: '1' }))).toEqual([
      'Sign-in was cancelled. No account was created.',
    ]);
  });

  it.each(Object.keys(SIGN_IN_NOTICES).filter((key) => key !== 'cancelled'))(
    'renders the ?error=%s notice',
    async (error) => {
      expect(notices(await renderPage({ error }))).toEqual([
        SIGN_IN_NOTICES[error as keyof typeof SIGN_IN_NOTICES],
      ]);
    },
  );

  it('explains why a GitHub email matching an unverified account linked nothing', async () => {
    const [notice] = notices(await renderPage({ error: 'email_unverified' }));
    expect(notice).toContain('GitHub was not connected');
    expect(notice).toContain('Verify that address first');
  });

  it('uses the first value of a repeated parameter', async () => {
    expect(notices(await renderPage({ error: ['state', 'unavailable'] }))).toEqual([
      SIGN_IN_NOTICES.state,
    ]);
  });

  it.each([['made_up'], ['cancelled'], ['__proto__'], ['toString']])(
    'shows nothing for an unknown ?error=%s and never echoes it',
    async (error) => {
      expect(notices(await renderPage({ error }))).toEqual([]);
    },
  );

  it('ignores ?cancelled with any value other than 1', async () => {
    expect(notices(await renderPage({ cancelled: 'yes' }))).toEqual([]);
  });

  it('carries a safe returnTo through to GitHub, the email form and registration', async () => {
    const tree = await renderPage({ returnTo: '/mentor?tab=2' });
    expect(githubLink(tree).props.href).toBe('/api/auth/github?returnTo=%2Fmentor%3Ftab%3D2');
    expect(findByType(tree, EmailSignInForm)[0]!.props.returnTo).toBe('/mentor?tab=2');
    expect(findByType(tree, Link).map((link) => link.props.href)).toContain(
      '/register?returnTo=%2Fmentor%3Ftab%3D2',
    );
  });

  it.each([['//evil.example'], ['https://evil.example'], ['/api/users']])(
    'drops an unsafe returnTo %s',
    async (returnTo) => {
      expect(githubLink(await renderPage({ returnTo })).props.href).toBe('/api/auth/github');
    },
  );
});
