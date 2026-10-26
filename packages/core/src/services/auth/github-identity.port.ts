import { ForbiddenError } from '../../http/errors';

/**
 * The GitHub identity port (primitive B14). The callback route depends on this shape
 * only; the container picks the adapter — the real one by default, the mock only when
 * `AUTH_IDENTITY_ADAPTER=mock` and `INTEGRATION_TEST_RUN=1` are both set.
 */
export interface GithubIdentityPort {
  /** Where to send the browser to start sign-in. `login` is a pre-selection hint. */
  authorizeUrl(input: AuthorizeUrlInput): string;
  /** Trade the callback's `code` for an access token. */
  exchangeCode(code: string): Promise<string>;
  /** Read the account behind `accessToken`; requires a primary, verified email. */
  fetchIdentity(accessToken: string): Promise<GithubIdentity>;
}

export interface AuthorizeUrlInput {
  /** The signed OAuth state, echoed back to the callback. */
  state: string;
  /** A GitHub login matching `GITHUB_LOGIN_PATTERN`. */
  login?: string;
}

export interface GithubIdentity {
  /** GitHub's numeric account id, as text. */
  githubId: string;
  login: string;
  /** The primary, verified email, lowercased. */
  email: string;
  avatarUrl: string | null;
}

/** GitHub's own login rule, also used to validate the start route's `?login=` hint. */
export const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9-]{1,39}$/;

export const GITHUB_CALLBACK_PATH = '/api/auth/github/callback';

/** The absolute OAuth callback URL for an `APP_URL`, tolerant of a trailing slash. */
export function githubCallbackUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, '')}${GITHUB_CALLBACK_PATH}`;
}

/**
 * The GitHub account has no primary verified email, so nobody can be signed in or
 * linked (edge case 3). A `ForbiddenError` so the JSON envelope stays `forbidden`; the
 * browser-navigated callback distinguishes it with `instanceof` and redirects.
 */
export class NoVerifiedEmailError extends ForbiddenError {
  constructor() {
    super('Your GitHub account has no verified primary email address');
  }
}
