import {
  apiHandler,
  homeFor,
  jsonOk,
  loginSchema,
  parseJsonBody,
  safeReturnTo,
  type UserDto,
  withRequestScope,
} from '@devmentor/core';

export const dynamic = 'force-dynamic';

/**
 * Sign in with an email and password (#13). JSON-only and called through `CrudForm`, so
 * `apiHandler` enforces the CSRF header. The service runs the hashing gate, the per-IP and
 * per-email rate limits and the credential check; every failure is an `AppError` and sets
 * no cookie — an unknown email and a wrong password are the same generic 401.
 *
 * On success: `{ ok: true, data: UserDto & { landingPath } }` plus the session cookie.
 * `landingPath` is additive — `data` is still a `UserDto` — and is where the client
 * navigates: the body's `returnTo` when `safeReturnTo` accepts it, else the role home of
 * the session's effective roles.
 */
export const POST = apiHandler(async (req) => {
  const input = await parseJsonBody(req, loginSchema);
  return withRequestScope(req, async ({ userService, sessionService }) => {
    const signIn = await userService.authenticateWithPassword(input, req);
    const [primary, ...others] = signIn.effectiveRoles;
    const { cookie } = await sessionService.issue({
      id: signIn.user.id,
      sessionVersion: signIn.sessionVersion,
    });
    const data: UserDto & { landingPath: string } = {
      ...signIn.user,
      landingPath: safeReturnTo(input.returnTo, homeFor([primary!, ...others])),
    };
    return jsonOk(data, 200, { 'set-cookie': cookie });
  });
});
