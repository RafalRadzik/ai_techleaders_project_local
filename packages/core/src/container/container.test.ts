import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from '../services/auth/session.service';
import { TokenService } from '../services/auth/token.service';
import { systemClock } from '../time/clock';
import type { AppEnv, RawEnv } from '../config/env';

const fork = vi.fn(() => ({ forked: true }));
const orm = { em: { fork } };
const logger = { info: vi.fn(), error: vi.fn() };

// Stub the ORM leaf so the test never imports @mikro-orm/* or opens a connection.
vi.mock('@devmentor/db', () => ({ getOrm: vi.fn(async () => orm), User: class {} }));
vi.mock('../logger', () => ({ createLogger: () => logger }));

// Drive the env the container sees per test without resetting the module registry.
const envState = vi.hoisted(() => ({ overrides: {} as RawEnv }));
vi.mock('../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/env')>();
  return { ...actual, getEnv: (): AppEnv => actual.parseAppEnv(envState.overrides) };
});

const { getContainer, withScope } = await import('./container');

const globalForContainer = globalThis as { __devmentorContainer?: unknown };

beforeEach(() => {
  envState.overrides = {};
  delete globalForContainer.__devmentorContainer;
  fork.mockClear();
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
    expect(a.em).toEqual({ forked: true });
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
