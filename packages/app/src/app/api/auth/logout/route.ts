import {
  apiHandler,
  jsonOk,
  readSessionCookie,
  ServiceUnavailableError,
  type SessionClaims,
  type SessionService,
  withScope,
} from '@devmentor/core';

export const dynamic = 'force-dynamic';

/** Claims of the request's session cookie, or `null` — including when sessions are unconfigured. */
async function claimsOf(
  sessionService: SessionService,
  cookieValue: string | null,
): Promise<SessionClaims | null> {
  if (!cookieValue) return null;
  try {
    return await sessionService.verify(cookieValue);
  } catch (error) {
    if (error instanceof ServiceUnavailableError) return null;
    throw error;
  }
}

/**
 * Sign out. CSRF is enforced by `apiHandler` (POST); a session is **not** required, so
 * signing out always reaches a clean state: an absent, expired or tampered cookie still
 * gets `{ ok: true, data: null }` and the expiring cookie. Only a live session — the
 * cookie verifies and its version still matches the row — bumps `sessionVersion`, which
 * revokes every copy of the cookie.
 */
export const POST = apiHandler((req) =>
  withScope(async ({ sessionService, userService }) => {
    const claims = await claimsOf(sessionService, readSessionCookie(req.headers.get('cookie')));
    if (claims) await userService.signOut(claims);
    return jsonOk(null, 200, { 'set-cookie': sessionService.clear() });
  }),
);
