import { createLogger, type Logger } from '../../logger';
import { redirectResponse } from '../../http/cookies';
import { BadRequestError, ServiceUnavailableError } from '../../http/errors';
import { NoVerifiedEmailError } from './github-identity.port';
import { AccountNotLinkedError } from './user.service';

export const SIGN_IN_PATH = '/sign-in';

/** Where a cancelled GitHub authorisation lands: nothing was created (edge case 2). */
export const SIGN_IN_CANCELLED_LOCATION = `${SIGN_IN_PATH}?cancelled=1`;

/**
 * Every `?error=` the browser-navigated sign-in routes emit; `/sign-in` renders each.
 * - `unavailable` — not configured (no secret / GitHub credentials), GitHub failed, timed
 *   out or refused the app, the database is down, or anything unexpected.
 * - `state` — missing, mismatched, tampered or expired state, a missing or rejected
 *   `code`: a plain retry.
 * - `no_verified_email` — the GitHub account has no primary verified email (edge case 3).
 * - `email_unverified` — the matching account's own email is not verified (edge case 4).
 * - `github_account_mismatch` — the matching account is linked to another GitHub account.
 * - `no_active_role` — an operator-only account no longer on the allowlist.
 * - `verification` — an email verification link that is invalid, expired or superseded
 *   by a later registration (Slice 4).
 */
export const SIGN_IN_ERRORS = [
  'unavailable',
  'state',
  'no_verified_email',
  'email_unverified',
  'github_account_mismatch',
  'no_active_role',
  'verification',
] as const;

export type SignInError = (typeof SIGN_IN_ERRORS)[number];

export function signInErrorLocation(error: SignInError): string {
  return `${SIGN_IN_PATH}?error=${error}`;
}

let cachedLogger: Logger | undefined;
function logger(): Logger {
  return (cachedLogger ??= createLogger());
}

function signInErrorFor(error: unknown): SignInError {
  if (error instanceof NoVerifiedEmailError) return 'no_verified_email';
  if (error instanceof AccountNotLinkedError) return error.reason;
  if (error instanceof BadRequestError) return 'state';
  return 'unavailable';
}

/**
 * Turn any failure in a browser-navigated sign-in route into a redirect to `/sign-in` —
 * never a JSON envelope rendered as a page. Expected outcomes are logged at `info`/`warn`;
 * anything unrecognised is logged at `error` and reported as `unavailable`.
 */
export function signInFailure(error: unknown, cookies: readonly string[] = []): Response {
  const code = signInErrorFor(error);
  if (code !== 'unavailable') {
    logger().info({ err: error, signInError: code }, 'github sign-in refused');
  } else if (error instanceof ServiceUnavailableError) {
    logger().warn({ err: error }, 'github sign-in unavailable');
  } else {
    logger().error({ err: error }, 'github sign-in failed unexpectedly');
  }
  return redirectResponse(signInErrorLocation(code), cookies);
}

/**
 * Turn a failure of the browser-navigated email-verification route into a redirect to
 * `/sign-in` — never a JSON envelope. A rejected link (`BadRequestError`: invalid, expired,
 * wrong purpose or superseded) is `verification`, logged at `info`; anything else is
 * `unavailable`, at `warn` when the app is unconfigured and at `error` when unexpected.
 */
export function verificationFailure(error: unknown): Response {
  if (error instanceof BadRequestError) {
    logger().info({ err: error, signInError: 'verification' }, 'email verification refused');
    return redirectResponse(signInErrorLocation('verification'));
  }
  if (error instanceof ServiceUnavailableError) {
    logger().warn({ err: error }, 'email verification unavailable');
  } else {
    logger().error({ err: error }, 'email verification failed unexpectedly');
  }
  return redirectResponse(signInErrorLocation('unavailable'));
}
