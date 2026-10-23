import {
  apiHandler,
  BadRequestError,
  homeFor,
  redirectResponse,
  safeReturnTo,
  signInErrorLocation,
  verificationFailure,
  withRequestScope,
} from '@devmentor/core';

export const dynamic = 'force-dynamic';

/**
 * The link in the verification email (#13). Browser-navigated, so every outcome is a 302
 * and never a JSON envelope: a valid link sets the session cookie and lands on the link's
 * `returnTo` (re-sanitised) or the role home; a valid link for an account with no active
 * role signs nobody in; an invalid, expired or superseded link goes to
 * `/sign-in?error=verification`; anything else to `/sign-in?error=unavailable`.
 */
export const GET = apiHandler(async (req) => {
  const token = new URL(req.url).searchParams.get('token');
  try {
    if (!token) throw new BadRequestError('Missing token');
    return await withRequestScope(req, async ({ emailVerificationService }) => {
      const { roles, cookie, returnTo } = await emailVerificationService.verify(token);
      const [primary, ...others] = roles;
      if (!cookie || !primary) return redirectResponse(signInErrorLocation('no_active_role'));
      return redirectResponse(safeReturnTo(returnTo, homeFor([primary, ...others])), [cookie]);
    });
  } catch (error) {
    return verificationFailure(error);
  }
});
