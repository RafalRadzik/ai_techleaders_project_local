import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import type { EntityManager } from '@devmentor/db';
import type { AppEnv } from '../config/env';
import type { Logger } from '../logger';
import type { PasswordHashingSlot, PasswordService } from '../services/auth/password.service';
import type { Clock } from '../time/clock';
import { TooManyRequestsError } from './errors';

/** A fixed window: at most `limit` attempts per `windowMs`, counted per key. */
export type RateLimitPolicy = { readonly limit: number; readonly windowMs: number };

/** One counter to consume: a hashed key and the policy that bounds it. */
export type RateLimitCheck = { readonly key: string; readonly policy: RateLimitPolicy };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Sign-in: 10 attempts per client IP per 15 minutes. */
export const SIGN_IN_PER_IP: RateLimitPolicy = { limit: 10, windowMs: 15 * MINUTE_MS };
/** Sign-in: 5 attempts per email per 15 minutes. */
export const SIGN_IN_PER_EMAIL: RateLimitPolicy = { limit: 5, windowMs: 15 * MINUTE_MS };
/** Registration: 5 attempts per client IP per hour. */
export const REGISTRATION_PER_IP: RateLimitPolicy = { limit: 5, windowMs: HOUR_MS };
/** Verification email resend: 3 per email per hour. */
export const VERIFICATION_RESEND_PER_EMAIL: RateLimitPolicy = { limit: 3, windowMs: HOUR_MS };

/**
 * Rows whose window started longer ago than this are expired under every policy, so the
 * limiter deletes them on each call.
 */
export const LONGEST_RATE_LIMIT_WINDOW_MS = Math.max(
  ...[SIGN_IN_PER_IP, SIGN_IN_PER_EMAIL, REGISTRATION_PER_IP, VERIFICATION_RESEND_PER_EMAIL].map(
    (policy) => policy.windowMs,
  ),
);

export type RateLimitScope = 'sign-in' | 'registration' | 'verification-resend';
export type RateLimitKind = 'ip' | 'email';

/**
 * `<scope>:<kind>:<sha256hex>` of the lower-cased identifier: the key holds no PII, and
 * `A@x` and `a@x` share one bucket.
 */
export function rateLimitKey(scope: RateLimitScope, kind: RateLimitKind, identifier: string): string {
  const digest = createHash('sha256').update(identifier.toLowerCase()).digest('hex');
  return `${scope}:${kind}:${digest}`;
}

/**
 * The client address: the `trustedProxyHops`-th entry from the right of `x-forwarded-for`,
 * because each trusted proxy appends the address it received the request from. With one
 * proxy that is the last entry; with two (CDN, then load balancer) the second-to-last.
 * Entries further left are client-controlled and never trusted.
 *
 * `0` hops trusts no entry. Next's own server fills `x-forwarded-for` with the socket
 * address only when the header is *absent* (`??=` in `base-server.js`), so without a proxy
 * a client can supply any value — reading it would make the per-IP limit bypassable.
 *
 * `null` when no address is derivable: no trusted hop, fewer entries than hops, or an
 * entry that is not an IP address.
 */
export function clientIp(headers: Headers, trustedProxyHops: number): string | null {
  if (trustedProxyHops === 0) return null;
  const entries = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const candidate = entries[entries.length - trustedProxyHops];
  return candidate !== undefined && isIP(candidate) !== 0 ? candidate : null;
}

/** What the key helpers need from the `Cradle`. */
export type RateLimitKeyDeps = {
  env: Pick<AppEnv, 'TRUSTED_PROXY_HOPS'>;
  logger: Pick<Logger, 'warn'>;
};

let warnedNoClientIp = false;

/** The per-IP check, or none — with one warning per process — when no IP is derivable. */
function ipCheck(
  req: Request,
  scope: RateLimitScope,
  policy: RateLimitPolicy,
  { env, logger }: RateLimitKeyDeps,
): RateLimitCheck[] {
  const ip = clientIp(req.headers, env.TRUSTED_PROXY_HOPS);
  if (ip === null) {
    if (!warnedNoClientIp) {
      warnedNoClientIp = true;
      logger.warn(
        { trustedProxyHops: env.TRUSTED_PROXY_HOPS },
        'rate limit: no client IP derivable, per-IP limits are skipped (set TRUSTED_PROXY_HOPS)',
      );
    }
    return [];
  }
  return [{ key: rateLimitKey(scope, 'ip', ip), policy }];
}

/** Sign-in: per IP (when derivable) and per email. */
export function signInLimits(req: Request, email: string, deps: RateLimitKeyDeps): RateLimitCheck[] {
  return [
    ...ipCheck(req, 'sign-in', SIGN_IN_PER_IP, deps),
    { key: rateLimitKey('sign-in', 'email', email), policy: SIGN_IN_PER_EMAIL },
  ];
}

/** Registration: per IP only (when derivable). */
export function registrationLimits(req: Request, deps: RateLimitKeyDeps): RateLimitCheck[] {
  return ipCheck(req, 'registration', REGISTRATION_PER_IP, deps);
}

/** Verification resend: per email only. */
export function verificationResendLimits(email: string): RateLimitCheck[] {
  return [
    { key: rateLimitKey('verification-resend', 'email', email), policy: VERIFICATION_RESEND_PER_EMAIL },
  ];
}

const DELETE_EXPIRED = `delete from "auth_rate_limits" where "window_start" < ?::timestamptz`;

// `?` placeholders are inlined (escaped) by MikroORM. In `do update`, both `case`s read the
// row as it was before the update, so an expired window resets count and start together.
const UPSERT = `insert into "auth_rate_limits" ("key", "window_start", "count")
values (?, ?::timestamptz, 1)
on conflict ("key") do update set
  "count" = case when "auth_rate_limits"."window_start" <= ?::timestamptz then 1
    else "auth_rate_limits"."count" + 1 end,
  "window_start" = case when "auth_rate_limits"."window_start" <= ?::timestamptz
    then excluded."window_start" else "auth_rate_limits"."window_start" end
returning "count", floor(extract(epoch from "window_start") * 1000)::float8 as "window_start_ms"`;

type UpsertRow = { count: number | string; window_start_ms: number | string };

/**
 * PostgreSQL-backed fixed-window counters (primitive B8), shared by every app instance
 * and surviving restarts. Scoped: it uses the request's forked `em` and the `clock` for
 * all window arithmetic, passed to SQL as parameters rather than `now()`.
 *
 * A window is `[window_start, window_start + windowMs)`. Every call counts — the counter
 * is never decremented.
 */
export class RateLimiter {
  private readonly em: EntityManager;
  private readonly clock: Clock;

  constructor({ em, clock }: { em: EntityManager; clock: Clock }) {
    this.em = em;
    this.clock = clock;
  }

  /**
   * Count one attempt against `key`; throw `TooManyRequestsError` (429) once the window
   * holds more than `policy.limit` attempts. Rows older than the longest window are
   * deleted first.
   */
  async consume(key: string, policy: RateLimitPolicy): Promise<void> {
    const now = this.clock.now();
    await this.em.execute(DELETE_EXPIRED, [iso(now.getTime() - LONGEST_RATE_LIMIT_WINDOW_MS)], 'run');
    const expiredBefore = iso(now.getTime() - policy.windowMs);
    const [row] = await this.em.execute<UpsertRow[]>(
      UPSERT,
      [key, iso(now.getTime()), expiredBefore, expiredBefore],
      'all',
    );
    if (Number(row!.count) > policy.limit) {
      const windowEndsMs = Number(row!.window_start_ms) + policy.windowMs;
      throw new TooManyRequestsError(Math.max(1, Math.ceil((windowEndsMs - now.getTime()) / 1000)));
    }
  }

  /**
   * Consume every check — each attempt counts against all of its keys, so the per-IP and
   * per-email counters advance independently — then throw the longest wait, if any.
   */
  async consumeAll(checks: readonly RateLimitCheck[]): Promise<void> {
    let exceeded: TooManyRequestsError | undefined;
    for (const { key, policy } of checks) {
      try {
        await this.consume(key, policy);
      } catch (error) {
        if (!(error instanceof TooManyRequestsError)) throw error;
        if (!exceeded || error.retryAfterSeconds! > exceeded.retryAfterSeconds!) exceeded = error;
      }
    }
    if (exceeded) throw exceeded;
  }
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * B8's ordering for any credential attempt: acquire a hashing-gate slot first, consume
 * the rate limit second, run the credential work third. A saturated gate then answers 503
 * without touching any counter, and a rate-limited attempt never reaches the hash.
 */
export function guardCredentialAttempt<T>(
  {
    passwordService,
    rateLimiter,
  }: {
    passwordService: Pick<PasswordService, 'withSlot'>;
    rateLimiter: Pick<RateLimiter, 'consumeAll'>;
  },
  checks: readonly RateLimitCheck[],
  fn: (slot: PasswordHashingSlot) => Promise<T>,
): Promise<T> {
  return passwordService.withSlot(async (slot) => {
    await rateLimiter.consumeAll(checks);
    return fn(slot);
  });
}
