import {
  AccountNotLinkedError,
  type Cradle,
  createOauthState,
  NoVerifiedEmailError,
  OAUTH_STATE_COOKIE_NAME,
  ServiceUnavailableError,
  SessionService,
  TokenService,
} from '@devmentor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppEnv } from '../../../../../../../core/src/config/env';

const state = vi.hoisted(() => ({
  cradle: {} as unknown,
  scopeError: null as unknown,
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Real `apiHandler`, state verification and session signing; the container (no database),
// the identity adapter, `UserService` and the logger are replaced.
vi.mock('../../../../../../../core/src/container/container', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  withRequestScope: async (_req: Request, fn: (cradle: Cradle) => Promise<unknown>) => {
    if (state.scopeError) throw state.scopeError;
    return fn(state.cradle as Cradle);
  },
}));
vi.mock('../../../../../../../core/src/logger', () => ({ createLogger: () => state.log }));

const route = await import('./route');

const SECRET = 's'.repeat(32);
let now = new Date('2026-10-23T10:00:00.000Z');
const clock = { now: () => now };
const IDENTITY = { githubId: '1', login: 'octo', email: 'octo@example.com', avatarUrl: null };

function setup(
  options: { roles?: string[]; secret?: string; signIn?: () => Promise<unknown> } = {},
) {
  const env = parseAppEnv({ SESSION_SECRET: options.secret ?? SECRET });
  const signingEnv = parseAppEnv({ SESSION_SECRET: SECRET });
  const identity = {
    authorizeUrl: vi.fn(),
    exchangeCode: vi.fn(async () => 'access-token'),
    fetchIdentity: vi.fn(async () => IDENTITY),
  };
  const userService = {
    findOrCreateFromGithub: vi.fn(
      options.signIn ??
        (async () => ({
          user: { id: 'u1' },
          sessionVersion: 7,
          created: false,
          effectiveRoles: options.roles ?? ['mentee'],
        })),
    ),
  };
  const sessionService = new SessionService({ env: signingEnv, clock });
  state.cradle = {
    env,
    clock,
    tokenService: new TokenService({ env, clock }),
    sessionService,
    identity,
    userService,
  };
  return { identity, userService, sessionService, signer: { tokenService: new TokenService({ env: signingEnv, clock }), clock, env: signingEnv } };
}

async function issuedState(signer: Parameters<typeof createOauthState>[0], returnTo?: string) {
  return (await createOauthState(signer, returnTo)).state;
}

function callback(query: string, stateCookie?: string): Promise<Response> {
  const headers = stateCookie ? { cookie: `${OAUTH_STATE_COOKIE_NAME}=${stateCookie}` } : undefined;
  return route.GET(
    new Request(`https://devmentor.test/api/auth/github/callback${query}`, { headers }),
    undefined as never,
  );
}

function expectNoOutboundCall(identity: ReturnType<typeof setup>['identity']) {
  expect(identity.exchangeCode).not.toHaveBeenCalled();
  expect(identity.fetchIdentity).not.toHaveBeenCalled();
}

function expectStateCleared(response: Response) {
  expect(response.headers.getSetCookie()).toContainEqual(
    expect.stringMatching(new RegExp(`^${OAUTH_STATE_COOKIE_NAME}=; Path=/api/auth/github; Max-Age=0`)),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.scopeError = null;
  now = new Date('2026-10-23T10:00:00.000Z');
});

describe('GET /api/auth/github/callback', () => {
  it('is force-dynamic', () => {
    expect(route.dynamic).toBe('force-dynamic');
  });

  it('access_denied → cancelled, with nothing exchanged or created', async () => {
    const { identity, userService } = setup();
    const response = await callback('?error=access_denied&state=x');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/sign-in?cancelled=1');
    expectNoOutboundCall(identity);
    expect(userService.findOrCreateFromGithub).not.toHaveBeenCalled();
    expectStateCleared(response);
  });

  it('any other provider error → unavailable, with nothing created', async () => {
    const { identity, userService } = setup();
    const response = await callback('?error=redirect_uri_mismatch');
    expect(response.headers.get('location')).toBe('/sign-in?error=unavailable');
    expectNoOutboundCall(identity);
    expect(userService.findOrCreateFromGithub).not.toHaveBeenCalled();
  });

  describe('state', () => {
    it('missing cookie → ?error=state, no outbound call', async () => {
      const { identity, signer } = setup();
      const sent = await issuedState(signer);
      const response = await callback(`?code=c&state=${sent}`);
      expect(response.headers.get('location')).toBe('/sign-in?error=state');
      expectNoOutboundCall(identity);
      expectStateCleared(response);
    });

    it('missing ?state → ?error=state, no outbound call', async () => {
      const { identity, signer } = setup();
      const response = await callback('?code=c', await issuedState(signer));
      expect(response.headers.get('location')).toBe('/sign-in?error=state');
      expectNoOutboundCall(identity);
    });

    it('?state not equal to the cookie → ?error=state, no outbound call', async () => {
      const { identity, signer } = setup();
      const mine = await issuedState(signer);
      const attackers = await issuedState(signer);
      const response = await callback(`?code=c&state=${attackers}`, mine);
      expect(response.headers.get('location')).toBe('/sign-in?error=state');
      expectNoOutboundCall(identity);
    });

    it('expired state → ?error=state, no outbound call', async () => {
      const { identity, signer } = setup();
      const sent = await issuedState(signer);
      now = new Date(now.getTime() + 601_000);
      const response = await callback(`?code=c&state=${sent}`, sent);
      expect(response.headers.get('location')).toBe('/sign-in?error=state');
      expectNoOutboundCall(identity);
    });

    it('missing code → ?error=state, no outbound call', async () => {
      const { identity, signer } = setup();
      const sent = await issuedState(signer);
      const response = await callback(`?state=${sent}`, sent);
      expect(response.headers.get('location')).toBe('/sign-in?error=state');
      expectNoOutboundCall(identity);
    });

    it('SESSION_SECRET unset → ?error=unavailable, no outbound call', async () => {
      const { identity, signer } = setup({ secret: '' });
      const sent = await issuedState(signer);
      const response = await callback(`?code=c&state=${sent}`, sent);
      expect(response.headers.get('location')).toBe('/sign-in?error=unavailable');
      expectNoOutboundCall(identity);
    });
  });

  describe('happy path', () => {
    it('signs in, sets the session cookie, clears the state and lands on the role home', async () => {
      const { identity, userService, sessionService, signer } = setup();
      const sent = await issuedState(signer);
      const response = await callback(`?code=the-code&state=${sent}`, sent);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/home');
      expect(identity.exchangeCode).toHaveBeenCalledWith('the-code');
      expect(identity.fetchIdentity).toHaveBeenCalledWith('access-token');
      expect(userService.findOrCreateFromGithub).toHaveBeenCalledWith(IDENTITY);

      const [session, cleared] = response.headers.getSetCookie();
      expect(session).toMatch(/^devmentor_session=[^;]+; Path=\/; Max-Age=86400/);
      const value = session!.split(';')[0]!.split('=')[1]!;
      await expect(sessionService.verify(value)).resolves.toEqual({
        userId: 'u1',
        sessionVersion: 7,
      });
      expect(cleared).toMatch(new RegExp(`^${OAUTH_STATE_COOKIE_NAME}=;`));
    });

    it.each([
      [['mentee'], '/home'],
      [['mentor'], '/mentor'],
      [['mentee', 'mentor'], '/mentor'],
      [['operator'], '/admin'],
      [['mentor', 'operator'], '/admin'],
      [['mentee', 'mentor', 'operator'], '/admin'],
    ])('effective roles %j land on %s', async (roles, home) => {
      const { signer } = setup({ roles });
      const sent = await issuedState(signer);
      const response = await callback(`?code=c&state=${sent}`, sent);
      expect(response.headers.get('location')).toBe(home);
    });

    it('honours the state returnTo', async () => {
      const { signer } = setup({ roles: ['mentor', 'operator'] });
      const sent = await issuedState(signer, '/mentors?q=ts#top');
      const response = await callback(`?code=c&state=${sent}`, sent);
      expect(response.headers.get('location')).toBe('/mentors?q=ts#top');
    });

    it.each(['//evil.example', 'https://evil.example', '/api/users', '/_next/x'])(
      'sanitises returnTo %s to the role home',
      async (returnTo) => {
        const { signer } = setup({ roles: ['mentor'] });
        const sent = await issuedState(signer, returnTo);
        const response = await callback(`?code=c&state=${sent}`, sent);
        expect(response.headers.get('location')).toBe('/mentor');
      },
    );

    it('ignores a returnTo query parameter on the callback itself', async () => {
      const { signer } = setup();
      const sent = await issuedState(signer);
      const response = await callback(`?code=c&state=${sent}&returnTo=%2Fadmin`, sent);
      expect(response.headers.get('location')).toBe('/home');
    });
  });

  describe('refusals after the exchange', () => {
    async function failWith(fail: Partial<ReturnType<typeof setup>['identity']> | (() => Promise<unknown>)) {
      const ctx =
        typeof fail === 'function' ? setup({ signIn: fail }) : setup();
      if (typeof fail !== 'function') Object.assign(ctx.identity, fail);
      const sent = await issuedState(ctx.signer);
      const response = await callback(`?code=c&state=${sent}`, sent);
      expect(response.status).toBe(302);
      expect(response.headers.get('content-type')).toBeNull();
      expect(response.headers.getSetCookie()).not.toContainEqual(
        expect.stringMatching(/^devmentor_session=[^;]/),
      );
      expectStateCleared(response);
      return response.headers.get('location');
    }

    it('no verified email → ?error=no_verified_email', async () => {
      const location = await failWith({
        fetchIdentity: vi.fn(async () => {
          throw new NoVerifiedEmailError();
        }),
      });
      expect(location).toBe('/sign-in?error=no_verified_email');
    });

    it.each(['email_unverified', 'github_account_mismatch'] as const)(
      'account not linked (%s) → ?error=%s',
      async (reason) => {
        const location = await failWith(async () => {
          throw new AccountNotLinkedError(reason);
        });
        expect(location).toBe(`/sign-in?error=${reason}`);
      },
    );

    it('GitHub down or timing out → ?error=unavailable', async () => {
      const location = await failWith({
        exchangeCode: vi.fn(async () => {
          throw new ServiceUnavailableError();
        }),
      });
      expect(location).toBe('/sign-in?error=unavailable');
    });

    it('an unexpected error is logged and → ?error=unavailable', async () => {
      const location = await failWith(async () => {
        throw new Error('db down');
      });
      expect(location).toBe('/sign-in?error=unavailable');
      expect(state.log.error).toHaveBeenCalledOnce();
    });

    it('an operator-only account off the allowlist → ?error=no_active_role, no session', async () => {
      const location = await failWith(async () => ({
        user: { id: 'u1' },
        sessionVersion: 1,
        created: false,
        effectiveRoles: [],
      }));
      expect(location).toBe('/sign-in?error=no_active_role');
    });
  });

  it('redirects to ?error=unavailable when the request scope cannot be opened', async () => {
    setup();
    state.scopeError = new Error('cannot connect');
    const response = await callback('?error=access_denied');
    expect(response.headers.get('location')).toBe('/sign-in?error=unavailable');
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
