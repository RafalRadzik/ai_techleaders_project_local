import { apiHandler, parseJsonBody, registerSchema, withRequestScope } from '@devmentor/core';

export const dynamic = 'force-dynamic';

/**
 * Register an email/password account (#13). JSON-only and CSRF-checked by `apiHandler`.
 * The service applies the registration rate limit, hashes the password and mails the
 * verification link; it answers `{ ok: true, data: { email } }` and sets **no** cookie —
 * the link is what signs the user in. A 409 refuses a verified address (pointing to GitHub
 * when the account signs in there), and a mail failure is a retryable 503.
 */
export const POST = apiHandler(async (req) => {
  const input = await parseJsonBody(req, registerSchema);
  return withRequestScope(req, ({ userService }) => userService.registerWithPassword(input, req));
});
