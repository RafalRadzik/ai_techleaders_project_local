import type { EntityManager, MikroORM } from '@devmentor/db';
import type { AppEnv } from '../config/env';
import type { Session } from '../http/auth';
import type { RateLimiter } from '../http/rate-limit';
import type { Logger } from '../logger';
import type { EventBus } from '../events/event-bus';
import type { GithubIdentityPort } from '../services/auth/github-identity.port';
import type { PasswordService } from '../services/auth/password.service';
import type { SessionService } from '../services/auth/session.service';
import type { TokenService } from '../services/auth/token.service';
import type { UserService } from '../services/auth/user.service';
import type { Mailer } from '../services/notifications/mailer.port';
import type { Clock } from '../time/clock';

/**
 * The typed shape of everything registered in the awilix container. Resolving any
 * key off `container.cradle` (or an injected `{ ... }: Cradle` in a constructor) is
 * type-checked against this interface end to end.
 *
 * Lifetimes:
 * - `env`, `logger`, `orm`, `clock`, `eventBus`, `sessionService`,
 *   `tokenService`, `passwordService`, `identity`, `mailer` — SINGLETON (shared for the process).
 * - `em`, `userService`, `rateLimiter` — SCOPED (created fresh per request scope).
 * - `session` — SCOPED and lazy: a memoised `Promise<Session | null>`. The live check
 *   (cookie, user row, `session_version`, roles) runs on first resolution only, so a
 *   route guard and a service in one scope share one user lookup. `null` outside
 *   `withRequestScope`/`withSessionCookieScope` and for any signed-out request.
 *
 * As services grow to ~9 concepts, each new one is a new explicit line here and in
 * `container.ts` — never auto-discovered from a folder scan.
 */
export interface Cradle {
  env: AppEnv;
  logger: Logger;
  orm: MikroORM;
  clock: Clock;
  eventBus: EventBus;
  sessionService: SessionService;
  tokenService: TokenService;
  /** scrypt hashing behind the process-wide concurrency gate (B9). */
  passwordService: PasswordService;
  /** GitHub identity port: the real adapter, or the mock under the two-signal rule. */
  identity: GithubIdentityPort;
  /** Outbound mail port: Resend, or the log mailer (harness pair or development fallback). */
  mailer: Mailer;
  em: EntityManager;
  userService: UserService;
  /** PostgreSQL-backed fixed-window counters (B8), on the scope's `em`. */
  rateLimiter: RateLimiter;
  session: Promise<Session | null>;
}
