import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireSession } from '../http/auth';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../http/errors';
import {
  EMAIL_VERIFY_PURPOSE,
  EmailVerificationService,
} from '../services/auth/email-verification.service';
import { GithubIdentityAdapter } from '../services/auth/adapters/github-identity';
import { MockGithubIdentityAdapter } from '../services/auth/adapters/mock-github-identity';
import { RateLimiter } from '../http/rate-limit';
import { PasswordService } from '../services/auth/password.service';
import { LogMailer } from '../services/notifications/adapters/log-mailer';
import { ResendMailer } from '../services/notifications/adapters/resend-mailer';
import { SessionService } from '../services/auth/session.service';
import { TokenService } from '../services/auth/token.service';
import { systemClock } from '../time/clock';
import type { AppEnv, RawEnv } from '../config/env';
import type { Cradle } from './cradle';

const findOne = vi.fn();
const fork = vi.fn(() => ({ forked: true, findOne }));
const orm = { em: { fork } };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

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
  createMailerAdapter,
  DEV_LOG_MAILER_WARNING,
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
  logger.warn.mockClear();
});

const PRODUCTION: RawEnv = {
  NODE_ENV: 'production',
  SESSION_SECRET: 's'.repeat(32),
  MAIL_API_KEY: 're_key',
  MAIL_FROM: 'no-reply@devmentor.example',
};

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

  it('registers one process-wide password service whose gate is sized by env', async () => {
    envState.overrides = { PASSWORD_HASH_CONCURRENCY: '1', PASSWORD_HASH_WAIT_MS: '0' };
    const container = await getContainer();
    const { passwordService } = container.cradle;
    expect(passwordService).toBeInstanceOf(PasswordService);
    expect(container.createScope().cradle.passwordService).toBe(passwordService);

    let finish!: () => void;
    const held = passwordService.withSlot(() => new Promise<void>((resolve) => (finish = resolve)));
    await expect(passwordService.withSlot(async () => 'second')).rejects.toMatchObject({
      status: 503,
    });
    finish();
    await held;
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

describe('mailer adapter selection', () => {
  it('registers the log mailer when both signals are set, as a singleton, without a warning', async () => {
    envState.overrides = { MAILER_ADAPTER: 'log', INTEGRATION_TEST_RUN: '1', MAIL_API_KEY: 're_key' };
    const container = await getContainer();
    expect(container.cradle.mailer).toBeInstanceOf(LogMailer);
    expect(container.createScope().cradle.mailer).toBe(container.cradle.mailer);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('refuses MAILER_ADAPTER=log without the integration-run signal', async () => {
    envState.overrides = { MAILER_ADAPTER: 'log' };
    await expect(getContainer()).rejects.toThrow(
      'MAILER_ADAPTER=log is only allowed with INTEGRATION_TEST_RUN=1',
    );
  });

  it('falls back to the log mailer in development without a key, warning once at creation', async () => {
    envState.overrides = { NODE_ENV: 'development' };
    const container = await getContainer();
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith({}, DEV_LOG_MAILER_WARNING);
    expect(container.cradle.mailer).toBeInstanceOf(LogMailer);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('uses Resend in development when a key is present', async () => {
    envState.overrides = { NODE_ENV: 'development', MAIL_API_KEY: 're_key' };
    const { cradle } = await getContainer();
    expect(cradle.mailer).toBeInstanceOf(ResendMailer);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses Resend in development when MAILER_ADAPTER=resend is explicit', async () => {
    envState.overrides = { NODE_ENV: 'development', MAILER_ADAPTER: 'resend' };
    const { cradle } = await getContainer();
    expect(cradle.mailer).toBeInstanceOf(ResendMailer);
  });

  it('never falls back to the log mailer under NODE_ENV=test', async () => {
    envState.overrides = { NODE_ENV: 'test' };
    const { cradle } = await getContainer();
    expect(cradle.mailer).toBeInstanceOf(ResendMailer);
  });

  it('falls back to Resend for a hand-built env with only the switch', () => {
    const env = { ...parseAppEnv({ NODE_ENV: 'production' }), MAILER_ADAPTER: 'log' as const };
    expect(createMailerAdapter(env, logger)).toBeInstanceOf(ResendMailer);
  });
});

describe('production config check', () => {
  it('throws on first creation in production without SESSION_SECRET', async () => {
    envState.overrides = { NODE_ENV: 'production' };
    await expect(getContainer()).rejects.toThrow(
      'SESSION_SECRET must be set when NODE_ENV=production',
    );
  });

  it('builds in production when SESSION_SECRET and the mail settings are set', async () => {
    envState.overrides = PRODUCTION;
    const { cradle } = await getContainer();
    expect(cradle.env.SESSION_SECRET).toBe('s'.repeat(32));
    expect(cradle.mailer).toBeInstanceOf(ResendMailer);
  });

  it.each(['MAIL_API_KEY', 'MAIL_FROM'])(
    'throws on first creation in production without %s',
    async (key) => {
      envState.overrides = { ...PRODUCTION, [key]: undefined };
      await expect(getContainer()).rejects.toThrow(`${key} must be set when NODE_ENV=production`);
    },
  );

  it('throws in production without a key even when MAILER_ADAPTER=resend is explicit', async () => {
    envState.overrides = { ...PRODUCTION, MAILER_ADAPTER: 'resend', MAIL_API_KEY: undefined };
    await expect(getContainer()).rejects.toThrow('MAIL_API_KEY must be set when NODE_ENV=production');
  });

  it('builds the harness shape: production with the log mailer pair and no mail key', async () => {
    envState.overrides = {
      NODE_ENV: 'production',
      SESSION_SECRET: 's'.repeat(32),
      MAILER_ADAPTER: 'log',
      INTEGRATION_TEST_RUN: '1',
    };
    const { cradle } = await getContainer();
    expect(cradle.mailer).toBeInstanceOf(LogMailer);
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

  it('registers a scoped rate limiter writing through the scope EntityManager', async () => {
    const execute = vi.fn(async (sql: string) =>
      sql.startsWith('delete') ? {} : [{ count: 1, window_start_ms: 0 }],
    );
    fork.mockReturnValueOnce({ forked: true, findOne, execute } as never);
    const first = await withScope(async ({ rateLimiter }) => {
      await rateLimiter.consume('sign-in:email:x', { limit: 1, windowMs: 1_000 });
      expect(rateLimiter).toBe(rateLimiter);
      return rateLimiter;
    });
    expect(first).toBeInstanceOf(RateLimiter);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(await withScope(({ rateLimiter }) => rateLimiter)).not.toBe(first);
  });

  it('registers a scoped email verification service on the scope EntityManager', async () => {
    envState.overrides = { SESSION_SECRET: 's'.repeat(32) };
    findOne.mockResolvedValue(null);
    const first = await withScope(async ({ emailVerificationService, tokenService }) => {
      expect(emailVerificationService).toBeInstanceOf(EmailVerificationService);
      const token = await tokenService.signPurposeToken({
        purpose: EMAIL_VERIFY_PURPOSE,
        subject: 'u1.',
        ttlSeconds: 60,
      });
      await expect(emailVerificationService.verify(token)).rejects.toBeInstanceOf(BadRequestError);
      return emailVerificationService;
    });
    expect(findOne).toHaveBeenCalledWith(expect.anything(), { id: 'u1' });
    expect(await withScope(({ emailVerificationService }) => emailVerificationService)).not.toBe(
      first,
    );
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

  it('wires the scope session into UserService lazily: building it looks nothing up', async () => {
    envState.overrides = { SESSION_SECRET: SECRET };
    findOne.mockResolvedValue(user);
    const req = requestWith(await signedCookie());

    await withRequestScope(req, async (cradle) => {
      expect(cradle.userService).toBeDefined();
      expect(findOne).not.toHaveBeenCalled();
      // A mentee's scope session reaches `list`, which refuses it.
      await expect(cradle.userService.list()).rejects.toBeInstanceOf(ForbiddenError);
    });
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('makes UserService.list refuse plain withScope work, which has no session', async () => {
    await expect(withScope((cradle) => cradle.userService.list())).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
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
