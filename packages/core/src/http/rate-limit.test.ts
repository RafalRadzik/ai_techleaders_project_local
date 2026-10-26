import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { EntityManager } from '@devmentor/db';
import { PasswordService, type PasswordHashingSlot } from '../services/auth/password.service';
import type { AppEnv } from '../config/env';
import { ServiceUnavailableError, TooManyRequestsError } from './errors';
import {
  clientIp,
  guardCredentialAttempt,
  LONGEST_RATE_LIMIT_WINDOW_MS,
  RateLimiter,
  rateLimitKey,
  registrationLimits,
  REGISTRATION_PER_IP,
  SIGN_IN_PER_EMAIL,
  SIGN_IN_PER_IP,
  signInLimits,
  VERIFICATION_RESEND_PER_EMAIL,
  verificationResendLimits,
  type RateLimitCheck,
  type RateLimitPolicy,
} from './rate-limit';

const NOW = new Date('2026-10-23T12:00:00.000Z');
const POLICY: RateLimitPolicy = { limit: 2, windowMs: 60_000 };
const sha = (text: string) => createHash('sha256').update(text).digest('hex');

/**
 * An in-memory stand-in for `auth_rate_limits` that interprets the limiter's parameters
 * the way the SQL does, so the window arithmetic is exercised without a database. The
 * statements themselves are proven against PostgreSQL in
 * `tests/integration/rate-limit.integration.test.ts`.
 */
function fakeTable() {
  const rows = new Map<string, { windowStart: number; count: number }>();
  const execute = vi.fn(async (sql: string, params: unknown[]) => {
    if (sql.startsWith('delete')) {
      const cutoff = Date.parse(params[0] as string);
      for (const [key, row] of rows) if (row.windowStart < cutoff) rows.delete(key);
      return { affectedRows: 0 };
    }
    const [key, start, expiredBefore] = params as [string, string, string];
    const existing = rows.get(key);
    const row =
      !existing || existing.windowStart <= Date.parse(expiredBefore)
        ? { windowStart: Date.parse(start), count: 1 }
        : { windowStart: existing.windowStart, count: existing.count + 1 };
    rows.set(key, row);
    // PostgreSQL may hand numbers back as strings; the limiter must accept both.
    return [{ count: String(row.count), window_start_ms: row.windowStart }];
  });
  return { rows, execute, em: { execute } as unknown as EntityManager };
}

function limiterAt(clockTime: { now: Date }) {
  const table = fakeTable();
  const limiter = new RateLimiter({ em: table.em, clock: { now: () => clockTime.now } });
  return { limiter, ...table };
}

describe('policies', () => {
  it('names the B8 numbers as constants', () => {
    expect(SIGN_IN_PER_IP).toEqual({ limit: 10, windowMs: 15 * 60_000 });
    expect(SIGN_IN_PER_EMAIL).toEqual({ limit: 5, windowMs: 15 * 60_000 });
    expect(REGISTRATION_PER_IP).toEqual({ limit: 5, windowMs: 60 * 60_000 });
    expect(VERIFICATION_RESEND_PER_EMAIL).toEqual({ limit: 3, windowMs: 60 * 60_000 });
    expect(LONGEST_RATE_LIMIT_WINDOW_MS).toBe(60 * 60_000);
  });
});

describe('rateLimitKey', () => {
  it('hashes the lower-cased identifier so the key holds no raw identifier', () => {
    const key = rateLimitKey('sign-in', 'email', 'Ada@Example.COM');
    expect(key).toBe(`sign-in:email:${sha('ada@example.com')}`);
    expect(key.toLowerCase()).not.toContain('ada');
    expect(rateLimitKey('sign-in', 'email', 'ada@example.com')).toBe(key);
  });
});

describe('clientIp', () => {
  const headers = (forwardedFor?: string) =>
    new Headers(forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor });

  it('trusts no entry with 0 hops', () => {
    expect(clientIp(headers('203.0.113.7'), 0)).toBeNull();
  });

  it('takes the last entry with 1 hop', () => {
    expect(clientIp(headers('6.6.6.6, 203.0.113.7'), 1)).toBe('203.0.113.7');
  });

  it('takes the second entry from the right with 2 hops', () => {
    expect(clientIp(headers('6.6.6.6, 203.0.113.7 ,198.51.100.1'), 2)).toBe('203.0.113.7');
    expect(clientIp(headers('2001:db8::1, 198.51.100.1'), 2)).toBe('2001:db8::1');
  });

  it('is null without the header, with fewer entries than hops, or for a non-address', () => {
    expect(clientIp(headers(), 1)).toBeNull();
    expect(clientIp(headers('198.51.100.1'), 2)).toBeNull();
    expect(clientIp(headers('unknown, ,'), 1)).toBeNull();
  });
});

describe('limit helpers', () => {
  const env = (hops: number) => ({ TRUSTED_PROXY_HOPS: hops }) as Pick<AppEnv, 'TRUSTED_PROXY_HOPS'>;
  const request = new Request('http://devmentor.test/api/auth/sign-in', {
    headers: { 'x-forwarded-for': '203.0.113.7' },
  });

  it('builds independent per-IP and per-email sign-in keys', () => {
    const logger = { warn: vi.fn() };
    expect(signInLimits(request, 'Ada@x.dev', { env: env(1), logger })).toEqual([
      { key: `sign-in:ip:${sha('203.0.113.7')}`, policy: SIGN_IN_PER_IP },
      { key: `sign-in:email:${sha('ada@x.dev')}`, policy: SIGN_IN_PER_EMAIL },
    ]);
    expect(registrationLimits(request, { env: env(1), logger })).toEqual([
      { key: `registration:ip:${sha('203.0.113.7')}`, policy: REGISTRATION_PER_IP },
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('keys verification resend by email only', () => {
    expect(verificationResendLimits('Ada@x.dev')).toEqual([
      { key: `verification-resend:email:${sha('ada@x.dev')}`, policy: VERIFICATION_RESEND_PER_EMAIL },
    ]);
  });

  it('skips the per-IP key without an IP and warns once per process', async () => {
    // Fresh module instance: the warn-once flag is module state.
    vi.resetModules();
    const fresh = await import('./rate-limit');
    const logger = { warn: vi.fn() };

    expect(fresh.signInLimits(request, 'ada@x.dev', { env: env(0), logger })).toEqual([
      { key: `sign-in:email:${sha('ada@x.dev')}`, policy: SIGN_IN_PER_EMAIL },
    ]);
    expect(fresh.registrationLimits(request, { env: env(0), logger })).toEqual([]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      { trustedProxyHops: 0 },
      expect.stringContaining('no client IP derivable'),
    );
  });
});

describe('RateLimiter.consume', () => {
  it('passes under the limit and throws a 429 with retryAfterSeconds above it', async () => {
    const clock = { now: NOW };
    const { limiter } = limiterAt(clock);
    await limiter.consume('k', POLICY);
    clock.now = new Date(NOW.getTime() + 20_500);
    await limiter.consume('k', POLICY);

    const error = await limiter.consume('k', POLICY).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TooManyRequestsError);
    expect(error).toMatchObject({
      status: 429,
      code: 'rate_limited',
      retryAfterSeconds: 40, // ceil(39.5 s left in the window)
      headers: { 'retry-after': '40' },
    });
  });

  it('rolls the window over once it has elapsed', async () => {
    const clock = { now: NOW };
    const { limiter, rows } = limiterAt(clock);
    await limiter.consume('k', POLICY);
    await limiter.consume('k', POLICY);
    await expect(limiter.consume('k', POLICY)).rejects.toBeInstanceOf(TooManyRequestsError);

    clock.now = new Date(NOW.getTime() + POLICY.windowMs);
    await expect(limiter.consume('k', POLICY)).resolves.toBeUndefined();
    expect(rows.get('k')).toEqual({ windowStart: clock.now.getTime(), count: 1 });
  });

  it('deletes rows older than the longest window on every call, with clock-based SQL params', async () => {
    const clock = { now: NOW };
    const { limiter, rows, execute } = limiterAt(clock);
    await limiter.consume('old', POLICY);
    clock.now = new Date(NOW.getTime() + LONGEST_RATE_LIMIT_WINDOW_MS + 1);
    await limiter.consume('new', POLICY);

    expect([...rows.keys()]).toEqual(['new']);
    expect(execute).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/^delete from "auth_rate_limits"/),
      [new Date(NOW.getTime() + 1).toISOString()],
      'run',
    );
    expect(execute).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('on conflict ("key")'),
      [
        'new',
        clock.now.toISOString(),
        new Date(clock.now.getTime() - POLICY.windowMs).toISOString(),
        new Date(clock.now.getTime() - POLICY.windowMs).toISOString(),
      ],
      'all',
    );
  });

  it('counts keys independently', async () => {
    const { limiter } = limiterAt({ now: NOW });
    await limiter.consume('ip', POLICY);
    await limiter.consume('ip', POLICY);
    await expect(limiter.consume('email', POLICY)).resolves.toBeUndefined();
  });
});

describe('RateLimiter.consumeAll', () => {
  const checks = (...keys: [string, RateLimitPolicy][]): RateLimitCheck[] =>
    keys.map(([key, policy]) => ({ key, policy }));

  it('consumes every key even after one is exceeded, then throws the longest wait', async () => {
    const clock = { now: NOW };
    const { limiter, rows } = limiterAt(clock);
    const short = { limit: 1, windowMs: 10_000 };
    const long = { limit: 1, windowMs: 60_000 };
    await limiter.consumeAll(checks(['a', short], ['b', long], ['c', POLICY]));

    const error = await limiter
      .consumeAll(checks(['a', short], ['b', long], ['c', POLICY]))
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 429, retryAfterSeconds: 60 });
    expect(rows.get('c')?.count).toBe(2);

    const reversed = await limiter
      .consumeAll(checks(['b', long], ['a', short]))
      .catch((e: unknown) => e);
    expect(reversed).toMatchObject({ retryAfterSeconds: 60 });
  });

  it('passes a database error straight through', async () => {
    const failure = new Error('connection lost');
    const limiter = new RateLimiter({
      em: { execute: vi.fn().mockRejectedValue(failure) } as unknown as EntityManager,
      clock: { now: () => NOW },
    });
    await expect(limiter.consumeAll(checks(['a', POLICY]))).rejects.toBe(failure);
  });
});

describe('guardCredentialAttempt', () => {
  const env = (concurrency: number) =>
    ({ PASSWORD_HASH_CONCURRENCY: concurrency, PASSWORD_HASH_WAIT_MS: 0 }) as AppEnv;
  const checks: RateLimitCheck[] = [{ key: 'sign-in:email:x', policy: SIGN_IN_PER_EMAIL }];

  it('acquires the gate, then consumes, then runs the credential work in the slot', async () => {
    const order: string[] = [];
    const slot = {} as PasswordHashingSlot;
    const withSlot = vi.fn(async (fn: (s: PasswordHashingSlot) => Promise<unknown>) => {
      order.push('gate');
      return fn(slot);
    });
    const passwordService = { withSlot } as unknown as Pick<PasswordService, 'withSlot'>;
    const rateLimiter = { consumeAll: vi.fn(async () => void order.push('consume')) };

    const result = await guardCredentialAttempt({ passwordService, rateLimiter }, checks, async (s) => {
      order.push('hash');
      expect(s).toBe(slot);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(order).toEqual(['gate', 'consume', 'hash']);
    expect(rateLimiter.consumeAll).toHaveBeenCalledWith(checks);
  });

  it('does not touch a counter when the hashing gate answers 503', async () => {
    const passwordService = new PasswordService({ env: env(1) });
    let release!: () => void;
    const held = passwordService.withSlot(() => new Promise<void>((resolve) => (release = resolve)));
    const rateLimiter = { consumeAll: vi.fn(async () => undefined) };
    const work = vi.fn(async () => 'never');

    await expect(
      guardCredentialAttempt({ passwordService, rateLimiter }, checks, work),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(rateLimiter.consumeAll).not.toHaveBeenCalled();
    expect(work).not.toHaveBeenCalled();
    release();
    await held;
  });

  it('never reaches the credential work when the limit is exceeded', async () => {
    const passwordService = new PasswordService({ env: env(1) });
    const rateLimiter = { consumeAll: vi.fn().mockRejectedValue(new TooManyRequestsError(30)) };
    const work = vi.fn(async () => 'never');

    await expect(
      guardCredentialAttempt({ passwordService, rateLimiter }, checks, work),
    ).rejects.toMatchObject({ status: 429 });
    expect(work).not.toHaveBeenCalled();
    // The slot was released: the next attempt gets it immediately.
    await expect(passwordService.withSlot(async () => 'free')).resolves.toBe('free');
  });
});
