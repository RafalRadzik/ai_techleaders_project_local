import {
  apiHandler,
  ForbiddenError,
  homeFor,
  jsonOk,
  parseJsonBody,
  redirectResponse,
  safeReturnTo,
  signInErrorLocation,
  withRequestScope,
} from '@devmentor/core';
import { verifyEmailSchema } from '@devmentor/core/validators/auth/verify-email.schema';

export const dynamic = 'force-dynamic';

/** Preserve emailed URLs without activating credentials or issuing a session on GET. */
export const GET = apiHandler(async (req) => {
  const token = new URL(req.url).searchParams.get('token');
  const location = token
    ? `/verify-email?${new URLSearchParams({ token })}`
    : signInErrorLocation('verification');
  return redirectResponse(location);
});

/** JSON-only completion; apiHandler enforces the shared CSRF header before parsing. */
export const POST = apiHandler(async (req) => {
  const { token, password } = await parseJsonBody(req, verifyEmailSchema);
  return withRequestScope(req, async ({ emailVerificationService }) => {
    const { roles, cookie, returnTo } = await emailVerificationService.verify(token, password);
    const [primary, ...others] = roles;
    if (!cookie || !primary) throw new ForbiddenError('This account has no active role.');
    return jsonOk(
      { landingPath: safeReturnTo(returnTo, homeFor([primary, ...others])) },
      200,
      { 'set-cookie': cookie },
    );
  });
});
