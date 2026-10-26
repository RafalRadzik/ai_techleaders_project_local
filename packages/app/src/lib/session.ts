import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  createLogger,
  ForbiddenError,
  homeFor,
  SESSION_COOKIE_NAME,
  ServiceUnavailableError,
  SIGN_IN_PATH,
  signInErrorLocation,
  UnauthorizedError,
  withSessionCookieScope,
  type Cradle,
  type Role,
  type Session,
  type UserDto,
} from '@devmentor/core';

/**
 * Page-level session and guards (primitive F3). Server-only: the `next/headers` cookie
 * read and every page `redirect()` live here, because `core` must not import `next`.
 * The live check itself is core's — the same operation `requireSession` runs for route
 * handlers (verify the JWT, compare `session_version`, resolve current roles) — reached
 * through the cookie-value request scope, never by synthesising a `Request`.
 */

export { homeFor };
export type { Role, Session, UserDto };

/** A live session, or why there is none. */
type PageSessionState = Session | 'signed_out' | 'no_active_role';

/** Run `fn` in a request scope bound to this request's session cookie. */
async function withPageScope<T>(fn: (cradle: Cradle) => Promise<T>): Promise<T> {
  const cookieValue = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return withSessionCookieScope(cookieValue, fn);
}

function signInLocation(currentPath: string): string {
  return `${SIGN_IN_PATH}?returnTo=${encodeURIComponent(currentPath)}`;
}

async function loadPageSession(): Promise<PageSessionState> {
  try {
    const session = await withPageScope((cradle) => cradle.session);
    return session ?? 'signed_out';
  } catch (error) {
    // `SESSION_SECRET` unset (dev/test): a page degrades to signed out instead of a 500.
    if (error instanceof ServiceUnavailableError) return 'signed_out';
    // An operator-only account removed from the allowlist: valid cookie, no authority.
    if (error instanceof ForbiddenError) return 'no_active_role';
    createLogger().error({ err: error }, 'Page session lookup failed');
    throw error;
  }
}

/**
 * The visitor's live session, or `null` when signed out — including a tampered,
 * expired or revoked cookie, unconfigured sessions, and an account with no active role.
 * Use on public pages (e.g. `/sign-in` sending a signed-in visitor to `homeFor`).
 */
export async function getPageSession(): Promise<Session | null> {
  const state = await loadPageSession();
  return typeof state === 'string' ? null : state;
}

/**
 * The live session, or a redirect before anything renders: to
 * `/sign-in?returnTo=<currentPath>` when signed out, or to `/sign-in?error=no_active_role`
 * when the account holds no active role (a plain sign-in would loop). Server components
 * are not given the request path, so each layout/page passes its own `currentPath`;
 * the sign-in flow re-sanitises it with `safeReturnTo`.
 */
export async function requirePageSession(currentPath: string): Promise<Session> {
  const state = await loadPageSession();
  if (state === 'no_active_role') redirect(signInErrorLocation('no_active_role'));
  if (state === 'signed_out') redirect(signInLocation(currentPath));
  return state;
}

/**
 * `requirePageSession`, then require `role`: a signed-in user without it is sent to their
 * own default home (`homeFor`) — a mentee opening a mentor screen lands on `/home`.
 * Call from every guarded layout **and** page; a layout does not re-run on client-side
 * navigation, so it is not the boundary on its own.
 */
export async function requirePageRole(role: Role, currentPath: string): Promise<Session> {
  const session = await requirePageSession(currentPath);
  if (!session.roles.includes(role)) redirect(homeFor(session.roles));
  return session;
}

/** A guarded page's session plus the caller's own user, for greeting them by name. */
export interface PageUser {
  session: Session;
  user: UserDto;
}

/**
 * `requirePageRole`, then the caller's own user (`UserService.current`). A session that
 * lapses between the two reads (signed out in another tab) is sent to sign-in like any
 * other signed-out visitor; nothing of the user's renders.
 */
export async function requirePageUser(role: Role, currentPath: string): Promise<PageUser> {
  const session = await requirePageRole(role, currentPath);
  try {
    const user = await withPageScope((cradle) => cradle.userService.current());
    return { session, user };
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect(signInLocation(currentPath));
    createLogger().error({ err: error }, 'Page user lookup failed');
    throw error;
  }
}
