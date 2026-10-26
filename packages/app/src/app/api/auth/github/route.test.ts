import {
  type Cradle,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_PURPOSE,
  ServiceUnavailableError,
  TokenService,
} from '@devmentor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppEnv } from '../../../../../../core/src/config/env';

const state = vi.hoisted(() => ({
  cradle: {} as unknown,
  scopeError: null as unknown,
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Real `apiHandler`, state helpers and `TokenService`; only the container (no database)
// and the logger are replaced.
vi.mock('../../../../../../core/src/container/container', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  withScope: async (fn: (cradle: Cradle) => Promise<unknown>) => {
    if (state.scopeError) throw state.scopeError;
    return fn(state.cradle as Cradle);
  },
}));
vi.mock('../../../../../../core/src/logger', () => ({ createLogger: () => state.log }));

const route = await import('./route');
const { MockGithubIdentityAdapter } = await import(
  '../../../../../../core/src/services/auth/adapters/mock-github-identity'
);
const { GithubIdentityAdapter } = await import(
  '../../../../../../core/src/services/auth/adapters/github-identity'
);

const SECRET = 's'.repeat(32);
const clock = { now: () => new Date('2026-10-23T10:00:00.000Z') };

function cradleFor(env: Record<string, string>, adapter: 'mock' | 'github' = 'github') {
  const appEnv = parseAppEnv(env);
  const identity =
    adapter === 'mock'
      ? new MockGithubIdentityAdapter({ env: appEnv })
      : new GithubIdentityAdapter({ env: appEnv, logger: state.log as never });
  const tokenService = new TokenService({ env: appEnv, clock });
  vi.spyOn(identity, 'authorizeUrl');
  state.cradle = { env: appEnv, clock, tokenService, identity };
  return { identity, tokenService };
}

const CONFIGURED = {
  SESSION_SECRET: SECRET,
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  APP_URL: 'https://devmentor.test',
};

function start(query = ''): Promise<Response> {
  return route.GET(
    new Request(`https://devmentor.test/api/auth/github${query}`),
    undefined as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.scopeError = null;
});

describe('GET /api/auth/github', () => {
  it('is force-dynamic', () => {
    expect(route.dynamic).toBe('force-dynamic');
  });

  it('sets the state cookie and redirects to GitHub with that state', async () => {
    const { tokenService } = cradleFor(CONFIGURED);
    const response = await start('?returnTo=%2Fmentors%3Fq%3Dts');

    expect(response.status).toBe(302);
    const location = new URL(response.headers.get('location')!);
    expect(location.origin + location.pathname).toBe('https://github.com/login/oauth/authorize');
    const sent = location.searchParams.get('state')!;
    expect(location.searchParams.has('login')).toBe(false);

    const [cookie] = response.headers.getSetCookie();
    expect(cookie).toContain(`${OAUTH_STATE_COOKIE_NAME}=${sent};`);
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Max-Age=600');
    const { subject } = await tokenService.verifyPurposeToken(sent, OAUTH_STATE_PURPOSE);
    expect(subject.endsWith('./mentors?q=ts')).toBe(true);
  });

  it('sanitises returnTo into the state', async () => {
    const { tokenService } = cradleFor(CONFIGURED);
    const response = await start('?returnTo=%2F%2Fevil.example');
    const sent = new URL(response.headers.get('location')!).searchParams.get('state')!;
    const { subject } = await tokenService.verifyPurposeToken(sent, OAUTH_STATE_PURPOSE);
    expect(subject).toMatch(/\.$/);
  });

  it('forwards a valid login hint', async () => {
    const { identity } = cradleFor(CONFIGURED);
    const response = await start('?login=octo-cat');
    expect(identity.authorizeUrl).toHaveBeenCalledWith(
      expect.objectContaining({ login: 'octo-cat' }),
    );
    expect(new URL(response.headers.get('location')!).searchParams.get('login')).toBe('octo-cat');
  });

  it.each(['bad login', 'a'.repeat(40), '', 'x/../y'])(
    'drops a malformed login hint %j rather than refusing',
    async (login) => {
      const { identity } = cradleFor(CONFIGURED);
      const response = await start(`?login=${encodeURIComponent(login)}`);
      expect(response.status).toBe(302);
      expect(identity.authorizeUrl).toHaveBeenCalledWith(
        expect.objectContaining({ login: undefined }),
      );
    },
  );

  it('with the mock adapter needs no GitHub credentials', async () => {
    cradleFor(
      { SESSION_SECRET: SECRET, APP_URL: 'http://localhost:3000', INTEGRATION_TEST_RUN: '1', AUTH_IDENTITY_ADAPTER: 'mock' },
      'mock',
    );
    const response = await start('?login=mock-operator');
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/api/auth/github/callback');
    expect(location.searchParams.get('code')).toBe('mock-operator');
  });

  it.each([
    ['SESSION_SECRET is unset', { ...CONFIGURED, SESSION_SECRET: '' }],
    ['GitHub credentials are unset', { SESSION_SECRET: SECRET }],
  ])('redirects to ?error=unavailable, not JSON, when %s', async (_name, env) => {
    cradleFor(env);
    const response = await start('?login=octo');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/sign-in?error=unavailable');
    expect(response.headers.get('content-type')).toBeNull();
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(state.log.warn).toHaveBeenCalledOnce();
  });

  it('redirects to ?error=unavailable when the container cannot be built', async () => {
    state.scopeError = new ServiceUnavailableError();
    const response = await start();
    expect(response.headers.get('location')).toBe('/sign-in?error=unavailable');
  });
});
