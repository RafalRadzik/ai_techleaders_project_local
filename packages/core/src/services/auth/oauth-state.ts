import { randomBytes } from 'node:crypto';
import type { AppEnv } from '../../config/env';
import { readCookie, serializeCookie } from '../../http/cookies';
import { BadRequestError } from '../../http/errors';
import { safeReturnTo } from '../../http/return-to';
import type { Clock } from '../../time/clock';
import type { TokenService } from './token.service';

/** The OAuth state cookie, scoped to the start and callback routes only. */
export const OAUTH_STATE_COOKIE_NAME = 'devmentor_oauth_state';
export const OAUTH_STATE_COOKIE_PATH = '/api/auth/github';
export const OAUTH_STATE_PURPOSE = 'oauth-state';
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

/** What creating and checking a state needs; a request-scoped cradle satisfies it. */
export interface OauthStateDeps {
  tokenService: Pick<TokenService, 'signPurposeToken' | 'verifyPurposeToken'>;
  clock: Clock;
  env: Pick<AppEnv, 'NODE_ENV'>;
}

export interface OauthState {
  /** The signed state, sent to the provider and echoed back to the callback. */
  state: string;
  /** `Set-Cookie` value binding the state to this browser. */
  cookie: string;
}

const NONCE_SEPARATOR = '.';

function stateCookie(env: OauthStateDeps['env'], value: string, maxAgeSeconds: number, expires: Date) {
  return serializeCookie(OAUTH_STATE_COOKIE_NAME, value, {
    path: OAUTH_STATE_COOKIE_PATH,
    maxAgeSeconds,
    expires,
    secure: env.NODE_ENV === 'production',
  });
}

/**
 * Sign a 10-minute state carrying the sanitised `returnTo`. The subject is
 * `<nonce>.<returnTo>`: the random nonce makes every attempt's state unique, and keeps the
 * subject non-empty when there is no `returnTo` (`signPurposeToken` refuses an empty one).
 * Throws `ServiceUnavailableError` when `SESSION_SECRET` is unset.
 */
export async function createOauthState(
  { tokenService, clock, env }: OauthStateDeps,
  returnTo: string | null | undefined,
): Promise<OauthState> {
  const nonce = randomBytes(16).toString('base64url');
  const state = await tokenService.signPurposeToken({
    purpose: OAUTH_STATE_PURPOSE,
    subject: `${nonce}${NONCE_SEPARATOR}${safeReturnTo(returnTo, '')}`,
    ttlSeconds: OAUTH_STATE_TTL_SECONDS,
  });
  const expires = new Date(clock.now().getTime() + OAUTH_STATE_TTL_SECONDS * 1000);
  return { state, cookie: stateCookie(env, state, OAUTH_STATE_TTL_SECONDS, expires) };
}

/**
 * Check the callback's `?state` against this browser's state cookie: **equality first**
 * (a purpose token proves we issued the claim, not who holds it — the cookie comparison
 * is what stops login CSRF), then signature, purpose and expiry. Returns the carried
 * `returnTo` (`''` when none), or `null` for a missing, mismatched, tampered or expired
 * state. Throws `ServiceUnavailableError` when `SESSION_SECRET` is unset.
 */
export async function verifyOauthState(
  { tokenService }: Pick<OauthStateDeps, 'tokenService'>,
  state: string | null,
  cookieHeader: string | null,
): Promise<{ returnTo: string } | null> {
  const expected = readCookie(cookieHeader, OAUTH_STATE_COOKIE_NAME);
  if (!state || !expected || state !== expected) return null;
  let subject: string;
  try {
    ({ subject } = await tokenService.verifyPurposeToken(state, OAUTH_STATE_PURPOSE));
  } catch (error) {
    if (error instanceof BadRequestError) return null;
    throw error;
  }
  const separator = subject.indexOf(NONCE_SEPARATOR);
  if (separator === -1) return null;
  return { returnTo: subject.slice(separator + 1) };
}

/** The `Set-Cookie` value that removes the state cookie once the callback has used it. */
export function clearOauthStateCookie(env: OauthStateDeps['env']): string {
  return stateCookie(env, '', 0, new Date(0));
}
