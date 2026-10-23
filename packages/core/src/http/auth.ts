import { User } from '@devmentor/db';
import type { Cradle } from '../container/cradle';
import { isOperatorEligible, ROLE_ORDER, type Role } from '../services/auth/roles';
import { readSessionCookie } from '../services/auth/session.service';
import { ForbiddenError, UnauthorizedError } from './errors';

/**
 * Authorization helpers (primitive B3). `core` stays framework-free: everything here
 * takes a plain `Request` or a cookie value; `next/headers` and `redirect()` live in
 * `packages/app/src/lib/`.
 */

/** The fixed role set; defined beside the role helpers in `services/auth/roles`. */
export type { Role };

/**
 * A live, verified session. `roles` is the stored set with `operator` resolved against
 * `OPERATOR_EMAILS` on this request, order-stable and duplicate-free, and never empty.
 */
export interface Session {
  userId: string;
  roles: readonly [Role, ...Role[]];
}

/** What loading a session needs from the request-scoped cradle. */
export type SessionCradle = Pick<Cradle, 'env' | 'em' | 'sessionService'>;

/** Header `apiCall` sends on every request; required on every mutating `/api/*` call. */
export const CSRF_HEADER_NAME = 'x-devmentor-request';

interface StoredUser {
  id: string;
  email: string;
  roles: readonly string[];
  emailVerifiedAt?: Date | null;
}

function isNonEmpty(roles: Role[]): roles is [Role, ...Role[]] {
  return roles.length > 0;
}

/**
 * Effective roles: `mentee`/`mentor` from the stored set, `operator` only while the row's
 * own verified email is on the allowlist — in both directions, on every request. The
 * stored `operator` member is a cache and carries no authority.
 */
function effectiveRoles(user: StoredUser, operatorEmails: readonly string[]): Session['roles'] {
  if (user.roles.length === 0) {
    // Corrupt despite the CHECK: an internal error (500), never a 401 sign-in loop.
    throw new Error(`users.roles is empty for user ${user.id}`);
  }
  const isOperator = isOperatorEligible(user, operatorEmails);
  const roles = ROLE_ORDER.filter((role) =>
    role === 'operator' ? isOperator : user.roles.includes(role),
  );
  if (!isNonEmpty(roles)) {
    // An operator-only row removed from the allowlist holds no authority. Not a 401
    // (signing in again would loop) and no invented fallback role.
    throw new ForbiddenError('This account has no active role');
  }
  return roles;
}

/**
 * The one live-session operation every path shares: verify the cookie value, reload the
 * user, compare `session_version`, resolve effective roles. `null` means signed out
 * (absent, malformed, tampered, expired, unknown user, revoked); callers decide whether
 * that denies. Throws `ServiceUnavailableError` when sessions are not configured and a
 * cookie is present. Internal — routes use `requireSession`, scopes use the `session` key.
 */
export async function loadSession(
  cookieValue: string | null | undefined,
  { env, em, sessionService }: SessionCradle,
): Promise<Session | null> {
  if (!cookieValue) return null;
  const claims = await sessionService.verify(cookieValue);
  if (!claims) return null;
  const user = await em.findOne(User, { id: claims.userId });
  if (!user || user.sessionVersion !== claims.sessionVersion) return null;
  return { userId: user.id, roles: effectiveRoles(user, env.OPERATOR_EMAILS) };
}

/** Cookie value each request scope was built for, so `requireSession` can reuse its `session`. */
const scopeCookies = new WeakMap<object, string | null>();

/** Internal: record the cookie value a request scope's `session` key resolves from. */
export function bindSessionScope(cradle: object, cookieValue: string | null): void {
  scopeCookies.set(cradle, cookieValue);
}

/**
 * Require a live session or throw `UnauthorizedError` (401). Inside a request scope for
 * the same request it reuses the scope's `session`, so a route guard and a service share
 * one user lookup; given any other cradle it performs the live check itself.
 */
export async function requireSession(req: Request, cradle: Cradle): Promise<Session> {
  const cookieValue = readSessionCookie(req.headers.get('cookie'));
  // An unbound cradle maps to `undefined`, which no cookie value (string | null) equals.
  const bound = scopeCookies.get(cradle) === cookieValue;
  const session = await (bound ? cradle.session : loadSession(cookieValue, cradle));
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

/** Require the session to hold `role` or throw `ForbiddenError` (403). */
export function requireRole(session: Session, role: Role): Session {
  if (!session.roles.includes(role)) {
    throw new ForbiddenError();
  }
  return session;
}

/**
 * Require the CSRF header or throw `ForbiddenError` (403). Presence is the defence; the
 * value is not inspected. Called only by `apiHandler`, for every method other than
 * GET/HEAD/OPTIONS — routes
 * never call it themselves. A plain HTML form cannot set the header, and a cross-origin
 * fetch carrying it triggers a preflight the app never answers.
 */
export function requireCsrfHeader(req: Request): void {
  if (!req.headers.has(CSRF_HEADER_NAME)) {
    throw new ForbiddenError(`Missing ${CSRF_HEADER_NAME} header`);
  }
}

/**
 * Assert the session owns the resource identified by `ownerId`, else throw
 * `ForbiddenError` (403). Use for every mutation — a mentee may only act on their own
 * bookings, a mentor only on their own profile/availability.
 */
export function assertOwnership(session: Session, ownerId: string): void {
  if (session.userId !== ownerId) {
    throw new ForbiddenError();
  }
}
