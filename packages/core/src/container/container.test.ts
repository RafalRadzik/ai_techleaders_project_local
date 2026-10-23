import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireSession } from '../http/auth';
import { UnauthorizedError } from '../http/errors';
import { GithubIdentityAdapter } from '../services/auth/adapters/github-identity';
import { MockGithubIdentityAdapter } from '../services/auth/adapters/mock-github-identity';
import { SessionService } from '../services/auth/session.service';
import { TokenService } from '../services/auth/token.service';
import { systemClock } from '../time/clock';
import type { AppEnv, RawEnv } from '../config/env';
import type { Cradle } from './cradle';

const findOne = vi.fn();
const fork = vi.fn(() => ({ forked: true, findOne }));
const orm = { em: { fork } };
const logger = { info: vi.fn(), error: vi.fn() };

// Stub the ORM leaf so the test never imports @mikro-orm/* or opens a connection.
vi.mock('@devmentor/db', () => ({
  getOrm: vi.fn(async () => orm),
  User: class {},
  USER_ROLES: ['mentee', 'mentor', 'operator'],
}));
vi.mock('../logger', () => ({ createLogger: () => logger }));

// Drive the env the container sees per test without resetting the module registry.
const envState = vi.hoisted(() => ({ overrides: {} as RawEnv }));
vi.mock('../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/env')>();
  return { ...actual, getEnv: (): AppEnv => actual.parseAppEnv(envState.overrides) };
});

const {
  createIdentityAdapter,
  getContainer,
  withRequestScope,
  withScope,
  withSessionCookieScope,
} = await import('./container');
const { parseAppEnv } = await import('../config/env');

const globalForContainer = globalThis as { __devmentorContainer?: unknown };

beforeEach(() => {
  envState.overrides = {};
  delete globalForContainer.__devmentorContainer;
  fork.mockClear();
  findOne.mockReset();
  logger.info.mockClear();
});

describe('getContainer', () => {
  it('builds once and caches the container on globalThis', async () => {
    const first = getContainer();
    expect(getContainer()).toBe(first);
    expect(globalForContainer.__devmentorContainer).toBe(first);
  });

  it('registers the system clock as the clock singleton', async () => {
    const container = await getContainer();
    expect(container.cradle.clock).toBe(systemClock);
    expect(container.createScope().cradle.clock).toBe(systemClock);
  });

  it('registers env, logger, orm and the event bus', async () => {
    const { cradle } = await getContainer();
    expect(cradle.env.APP_NAME).toEqual(expect.any(String));
    expect(cradle.logger).toBe(logger);
    expect(cradle.orm).toBe(orm);
    expect(cradle.eventBus).toBeDefined();
    expect(cradle.eventBus).toBe(cradle.eventBus);
  });

  it('registers the token service as a singleton wired to env and clock', async () => {
    envState.overrides = { SESSION_SECRET: 's'.repeat(32) };
    const container = await getContainer();
    const { tokenService } = container.cradle;
    expect(tokenService).toBeInstanceOf(TokenService);
    expect(container.createScope().cradle.tokenService).toBe(tokenService);

    const token = await tokenService.signPurposeToken({
      purpose: 'email-verification',
      subject: 'u1',
      ttlSeconds: 60,
    });
    await expect(tokenService.verifyPurposeToken(token, 'email-verification')).resolves.toEqual({
      subject: 'u1',
    });
  });

  it('registers the session service as a singleton wired to env and clock', async () => {
    envState.overrides = { SESSION_SECRET: 's'.repeat(32) };
    const container = await getContainer();
    const { sessionService } = container.cradle;
    expect(sessionService).toBeInstanceOf(SessionService);
    expect(container.createScope().cradle.sessionService).toBe(sessionService);

    const { cookie, expiresAt } = await sessionService.issue({ id: 'u1', sessionVersion: 0 });
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    const token = cookie.split(';')[0]?.slice('devmentor_session='.length) ?? '';
    await expect(sessionService.verify(token)).resolves.toEqual({ userId: 'u1', sessionVersion: 0 });
  });

  it('logs auth.user.created through the default subscriber', async () => {
    const { cradle } = await getContainer();
    await cradle.eventBus.emit('auth.user.created', { userId: 'u1', email: 'u1@example.com' });
    expect(logger.info).toHaveBeenCalledWith({ userId: 'u1' }, 'auth.user.created');
  });

  it('logs auth.user.roles_changed through the default subscriber', async () => {
    const { cradle } = await getContainer();
    const change = { userId: 'u1', roles: ['mentee' as const], previousRoles: ['mentee' as const, 'operator' as const] };
    await cradle.eventBus.emit('auth.user.roles_changed', change);
    expect(logger.info).toHaveBeenCalledWith(change, 'auth.user.roles_changed');
  });
});

describe('identity adapter selection', () => {
  it('registers the real GitHub adapter by default, as a singleton', async () => {
    const container = await getContainer();
    const { identity } = container.cradle;
    expect(identity).toBeInstanceOf(GithubIdentityAdapter);
    expect(container.createScope().cradle.identity).toBe(identity);
  });

  it('registers the real adapter when only the integration-run signal is set', async () => {
    envState.overrides = { INTEGRATION_TEST_RUN: '1' };
    const { cradle } = await getContainer();
    expect(cradle.identity).toBeInstanceOf(GithubIdentityAdapter);
  });

  it('registers the mock adapter when both signals are set', async () => {
    envState.overrides = { AUTH_IDENTITY_ADAPTER: 'mock', INTEGRATION_TEST_RUN: '1' };
    const { cradle } = await getContainer();
    expect(cradle.identity).toBeInstanceOf(MockGithubIdentityAdapter);
  });

  it('never builds a container with the mock in a production-shaped env without the signal', async () => {
    envState.overrides = {
      NODE_ENV: 'production',
      SESSION_SECRET: 's'.repeat(32),
      AUTH_IDENTITY_ADAPTER: 'mock',
    };
    await expect(getContainer()).rejects.toThrow(
      'AUTH_IDENTITY_ADAPTER=mock is only allowed with INTEGRATION_TEST_RUN=1',
    );
  });

  it('falls back to the real adapter for a hand-built env with only the switch', () => {
    const env = { ...parseAppEnv({}), AUTH_IDENTITY_ADAPTER: 'mock' as const };
    expect(createIdentityAdapter({ env, logger } as unknown as Cradle)).toBeInstanceOf(
      GithubIdentityAdapter,
    );
  });
});

describe('production config check', () => {
  it('throws on first creation in production without SESSION_SECRET', async () => {
    envState.overrides = { NODE_ENV: 'production' };
    await expect(getContainer()).rejects.toThrow(
      'SESSION_SECRET must be set when NODE_ENV=production',
    );
  });

  it('builds in production when SESSION_SECRET is set', async () => {
    envState.overrides = { NODE_ENV: 'production', SESSION_SECRET: 's'.repeat(32) };
    const { cradle } = await getContainer();
    expect(cradle.env.SESSION_SECRET).toBe('s'.repeat(32));
  });

  it('builds in development without SESSION_SECRET', async () => {
    envState.overrides = { NODE_ENV: 'development' };
    const { cradle } = await getContainer();
    expect(cradle.env.SESSION_SECRET).toBeUndefined();
  });
});

describe('withScope', () => {
  it('gives each scope its own forked EntityManager and scoped services', async () => {
    const a = await withScope((cradle) => ({ em: cradle.em, users: cradle.userService }));
    const b = await withScope((cradle) => ({ em: cradle.em, users: cradle.userService }));
    expect(fork).toHaveBeenCalledTimes(2);
    expect(a.em).toMatchObject({ forked: true });
    expect(a.users).not.toBe(b.users);
  });

  it('disposes the scope and rethrows when fn fails', async () => {
    const container = await getContainer();
    const scope = container.createScope();
    const dispose = vi.spyOn(scope, 'dispose');
    vi.spyOn(container, 'createScope').mockReturnValueOnce(scope);

    await expect(
      withScope(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('scoped session', () => {
  const SECRET = 's'.repeat(32);
  const user = {
    id: 'u1',
    email: 'ada@example.com',
    roles: ['mentee'],
    emailVerifiedAt: new Date(),
    sessionVersion: 0,
  };

  async function signedCookie(): Promise<string> {
    const { cradle } = await getContainer();
    const { cookie } = await cradle.sessionService.issue({ id: 'u1', sessionVersion: 0 });
    return cookie.split(';')[0]!.slice('devmentor_session='.length);
  }

  function requestWith(cookie?: string): Request {
    return new Request('http://devmentor.test/api/x', {
      headers: cookie === undefined ? {} : { cookie: `devmentor_session=${cookie}` },
    });
  }

  it('resolves to null in a plain withScope', async () => {
    await expect(withScope((cradle) => cradle.session)).resolves.toBeNull();
  });

  it('resolves to null in a request scope without a session cookie', async () => {
    await expect(withRequestScope(requestWith(), (cradle) => cradle.session)).resolves.toBeNull();
    await expect(withSessionCookieScope(undefined, (c) => c.session)).resolves.toBeNull();
    await expect(withSessionCookieScope('', (c) => c.session)).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('gives a public route null for an invalid cookie rather than throwing', async () => {
    envState.overrides = { SESSION_SECRET: SECRET };
    await expect(
      withRequestScope(requestWith('not-a-jwt'), (cradle) => cradle.session),
    ).resolves.toBeNull();
  });

  it('resolves the live session once per scope, shared with requireSession', async () => {
    envState.overrides = { SESSION_SECRET: SECRET };
    findOne.mockResolvedValue(user);
    const req = requestWith(await signedCookie());

    const result = await withRequestScope(req, async (cradle) => {
      expect(findOne).not.toHaveBeenCalled(); // lazy until first resolution
      const first = await cradle.session;
      const second = await cradle.session;
      const required = await requireSession(req, cradle);
      return { first, second, required };
    });

    expect(result.first).toEqual({ userId: 'u1', roles: ['mentee'] });
    expect(result.second).toBe(result.first);
    expect(result.required).toBe(result.first);
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('resolves afresh in each new scope', async () => {
    envState.overrides = { SESSION_SECRET: SECRET };
    findOne.mockResolvedValue(user);
    const cookie = await signedCookie();
    await withSessionCookieScope(cookie, (cradle) => cradle.session);
    await withSessionCookieScope(cookie, (cradle) => cradle.session);
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('lets requireSession fail closed with 401 in a signed-out request scope', async () => {
    const req = requestWith();
    await expect(
      withRequestScope(req, (cradle) => requireSession(req, cradle)),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('disposes the request scope and rethrows when fn fails', async () => {
    const container = await getContainer();
    const scope = container.createScope();
    const dispose = vi.spyOn(scope, 'dispose');
    vi.spyOn(container, 'createScope').mockReturnValueOnce(scope);

    await expect(
      withRequestScope(requestWith(), () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
