import {
  apiHandler,
  createOauthState,
  GITHUB_LOGIN_PATTERN,
  redirectResponse,
  signInFailure,
  withScope,
} from '@devmentor/core';

export const dynamic = 'force-dynamic';

/**
 * Start GitHub sign-in. Browser-navigated, so every failure — no `SESSION_SECRET`, no
 * GitHub credentials (the real adapter refuses), the database down — is a redirect to
 * `/sign-in?error=unavailable`, never a JSON envelope. On success: a signed 10-minute
 * state bound to this browser by the `devmentor_oauth_state` cookie, and a 302 to the
 * provider. `?login` is forwarded as GitHub's pre-selection hint only when it is a valid
 * GitHub login; anything else is dropped, not refused.
 */
export const GET = apiHandler(async (req) => {
  try {
    return await withScope(async (cradle) => {
      const params = new URL(req.url).searchParams;
      const { state, cookie } = await createOauthState(cradle, params.get('returnTo'));
      const hint = params.get('login');
      const login = hint !== null && GITHUB_LOGIN_PATTERN.test(hint) ? hint : undefined;
      return redirectResponse(cradle.identity.authorizeUrl({ state, login }), [cookie]);
    });
  } catch (error) {
    return signInFailure(error);
  }
});
