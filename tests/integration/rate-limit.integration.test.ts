import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  LONGEST_RATE_LIMIT_WINDOW_MS,
  RateLimiter,
  rateLimitKey,
  TooManyRequestsError,
  type RateLimitPolicy,
} from '@devmentor/core';
import { entities, MikroORM } from '@devmentor/db';
import { integrationChildEnvironment } from './environment';

const execFileAsync = promisify(execFile);
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const START = new Date('2026-10-23T12:00:00.123Z');
const POLICY: RateLimitPolicy = { limit: 3, windowMs: 60_000 };

/**
 * TC-RATE-LIMIT-001 — B8's raw-SQL upsert and inline expiry delete against real
 * PostgreSQL. The unit tests cover the limiter's branches against a stand-in table; this
 * proves the statements themselves: placeholders, the `on conflict` window reset, the
 * returned window start, and the delete. The clock is injected, so nothing sleeps.
 */
describe('TC-RATE-LIMIT-001 PostgreSQL-backed fixed-window counters', () => {
  let postgres: StartedPostgreSqlContainer | undefined;
  let orm: MikroORM | undefined;
  const clock = { now: START };

  const limiter = () => new RateLimiter({ em: orm!.em.fork(), clock: { now: () => clock.now } });
  const at = (offsetMs: number) => {
    clock.now = new Date(START.getTime() + offsetMs);
  };
  const rows = () =>
    orm!.em
      .fork()
      .execute<{ key: string; count: number; window_start: Date }[]>(
        `select "key", "count", "window_start" from "auth_rate_limits" order by "key"`,
      );

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('devmentor_rate_limit')
      .withUsername('devmentor')
      .withPassword('devmentor')
      .start();
    await execFileAsync(npmExecutable, ['run', 'db:migrate'], {
      cwd: process.cwd(),
      env: integrationChildEnvironment(postgres.getConnectionUri()),
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120_000,
    });
    orm = await MikroORM.init({
      clientUrl: postgres.getConnectionUri(),
      entities,
      pool: { min: 0, max: 4 },
    });
    await orm.connect();
  });

  beforeEach(async () => {
    clock.now = START;
    await orm!.em.fork().execute(`delete from "auth_rate_limits"`);
  });

  afterAll(async () => {
    await orm?.close(true);
    await postgres?.stop();
  });

  it('passes under the limit and answers 429 with retryAfterSeconds above it', async () => {
    const key = rateLimitKey('sign-in', 'email', 'Ada@DevMentor.test');
    for (let attempt = 0; attempt < POLICY.limit; attempt += 1) {
      await limiter().consume(key, POLICY);
    }
    at(20_500);
    const error = await limiter()
      .consume(key, POLICY)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TooManyRequestsError);
    expect(error).toMatchObject({ status: 429, code: 'rate_limited', retryAfterSeconds: 40 });
    // Every attempt counts, the refused one too; the key holds no raw identifier.
    const [row] = await rows();
    expect(row).toMatchObject({ key, count: 4 });
    expect(new Date(row!.window_start).toISOString()).toBe(START.toISOString());
    expect(row!.key).not.toContain('ada');
  });

  it('rolls the window over at exactly windowMs', async () => {
    const key = 'sign-in:ip:rollover';
    for (let attempt = 0; attempt <= POLICY.limit; attempt += 1) {
      await limiter().consume(key, POLICY).catch(() => undefined);
    }
    at(POLICY.windowMs - 1);
    await expect(limiter().consume(key, POLICY)).rejects.toMatchObject({ retryAfterSeconds: 1 });

    at(POLICY.windowMs);
    await expect(limiter().consume(key, POLICY)).resolves.toBeUndefined();
    const [row] = await rows();
    expect(row!.count).toBe(1);
    expect(new Date(row!.window_start).toISOString()).toBe(clock.now.toISOString());
  });

  it('deletes rows older than the longest window on the next call, for any key', async () => {
    await limiter().consume('verification-resend:email:old', POLICY);
    at(LONGEST_RATE_LIMIT_WINDOW_MS - 1);
    await limiter().consume('sign-in:email:recent', POLICY);
    expect((await rows()).map((row) => row.key)).toEqual([
      'sign-in:email:recent',
      'verification-resend:email:old',
    ]);

    at(LONGEST_RATE_LIMIT_WINDOW_MS + 1);
    await limiter().consume('sign-in:email:new', POLICY);
    expect((await rows()).map((row) => row.key)).toEqual([
      'sign-in:email:new',
      'sign-in:email:recent',
    ]);
  });

  it('counts per-IP and per-email keys independently', async () => {
    const ip = rateLimitKey('sign-in', 'ip', '203.0.113.7');
    const email = rateLimitKey('sign-in', 'email', 'ada@devmentor.test');
    for (let attempt = 0; attempt < POLICY.limit; attempt += 1) {
      await limiter().consume(ip, POLICY);
    }
    await expect(limiter().consume(ip, POLICY)).rejects.toBeInstanceOf(TooManyRequestsError);
    await expect(limiter().consume(email, POLICY)).resolves.toBeUndefined();
    expect((await rows()).map(({ key, count }) => [key, count])).toEqual([
      [email, 1],
      [ip, POLICY.limit + 1],
    ]);
  });

  it('stays atomic under concurrent attempts on one key', async () => {
    const key = 'sign-in:email:concurrent';
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => limiter().consume(key, POLICY)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(POLICY.limit);
    expect((await rows())[0]!.count).toBe(8);
  });
});
