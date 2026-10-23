import {
  apiHandler,
  clearOauthStateCookie,
  homeFor,
  redirectResponse,
  safeReturnTo,
  SIGN_IN_CANCELLED_LOCATION,
  signInErrorLocation,
  signInFailure,
  verifyOauthState,
  withRequestScope,
} from '@devmentor/core';

export const dynamic = 'force-dynamic';

/**
 * GitHub's OAuth callback. Browser-navigated: every outcome is a 302, and every outcome
 * reached inside the request scope also expires the single-use state cookie.
 *
 * Order matters: a provider `?error` first (`access_denied` is a cancellation; anything
 * else means the app is misconfigured upstream), then the state — compared with the
 * cookie for equality before its signature is checked — and the `code`, all **before**
 * any outbound call, so a forged callback costs nothing. Only then the exchange, the
 * identity, `findOrCreateFromGithub`, and a session cookie for the user's effective
 * roles. The destination is the state's `returnTo`, re-sanitised, else the role home.
 */
export const GET = apiHandler(async (req) => {
  const params = new URL(req.url).searchParams;
  let cookies: string[] = [];
  try {
    return await withRequestScope(req, async (cradle) => {
      cookies = [clearOauthStateCookie(cradle.env)];

      const providerError = params.get('error');
      if (providerError !== null) {
        const location =
          providerError === 'access_denied'
            ? SIGN_IN_CANCELLED_LOCATION
            : signInErrorLocation('unavailable');
        return redirectResponse(location, cookies);
      }

      const verified = await verifyOauthState(
        cradle,
        params.get('state'),
        req.headers.get('cookie'),
      );
      const code = params.get('code');
      if (!verified || !code) return redirectResponse(signInErrorLocation('state'), cookies);

      const accessToken = await cradle.identity.exchangeCode(code);
      const identity = await cradle.identity.fetchIdentity(accessToken);
      const signIn = await cradle.userService.findOrCreateFromGithub(identity);

      const [primary, ...others] = signIn.effectiveRoles;
      if (!primary) return redirectResponse(signInErrorLocation('no_active_role'), cookies);

      const session = await cradle.sessionService.issue({
        id: signIn.user.id,
        sessionVersion: signIn.sessionVersion,
      });
      const destination = safeReturnTo(verified.returnTo, homeFor([primary, ...others]));
      return redirectResponse(destination, [session.cookie, ...cookies]);
    });
  } catch (error) {
    return signInFailure(error, cookies);
  }
});
