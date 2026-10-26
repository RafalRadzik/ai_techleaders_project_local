import { z } from 'zod';
import type { AppEnv } from '../../../config/env';
import { BadRequestError, ServiceUnavailableError } from '../../../http/errors';
import { fetchJson, type OutboundLogger } from '../../../http/outbound';
import {
  GITHUB_LOGIN_PATTERN,
  githubCallbackUrl,
  NoVerifiedEmailError,
  type AuthorizeUrlInput,
  type GithubIdentity,
  type GithubIdentityPort,
} from '../github-identity.port';

export const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_USER_URL = 'https://api.github.com/user';
export const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';
export const GITHUB_SCOPE = 'read:user user:email';

// GitHub answers a rejected exchange with 200 and an `error` field, not a 4xx.
const tokenResponseSchema = z.union([
  z.object({ access_token: z.string().min(1) }),
  z.object({ error: z.string() }),
]);

const userSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().regex(GITHUB_LOGIN_PATTERN),
  avatar_url: z.string().nullish(),
});

const emailsSchema = z.array(
  z.object({ email: z.string().min(1), primary: z.boolean(), verified: z.boolean() }),
);

function parseUpstream<T>(schema: z.ZodType<T>, body: unknown, url: string): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ServiceUnavailableError(undefined, {
      cause: { reason: 'invalid_response', url, issues: parsed.error.issues },
    });
  }
  return parsed.data;
}

/**
 * The real GitHub OAuth adapter: no SDK, every call through `fetchJson` (10 s timeout,
 * `ServiceUnavailableError` on non-2xx, timeout or network failure, no body or token in
 * the logs). Credentials are optional in the env schema, so each call that needs them
 * fails closed with `ServiceUnavailableError` when they are unset.
 */
export class GithubIdentityAdapter implements GithubIdentityPort {
  private readonly env: AppEnv;
  private readonly logger: OutboundLogger;

  constructor({ env, logger }: { env: AppEnv; logger: OutboundLogger }) {
    this.env = env;
    this.logger = logger;
  }

  authorizeUrl({ state, login }: AuthorizeUrlInput): string {
    const { clientId } = this.credentials();
    if (login !== undefined && !GITHUB_LOGIN_PATTERN.test(login)) {
      throw new BadRequestError('Invalid GitHub login hint');
    }
    const url = new URL(GITHUB_AUTHORIZE_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', githubCallbackUrl(this.env.APP_URL));
    url.searchParams.set('scope', GITHUB_SCOPE);
    url.searchParams.set('state', state);
    if (login !== undefined) url.searchParams.set('login', login);
    return url.toString();
  }

  /**
   * Exchanges the callback `code`. An expired or reused code (`bad_verification_code`)
   * is the caller's problem — `BadRequestError`; any other `error` (wrong secret,
   * redirect mismatch) means the integration is misconfigured — `ServiceUnavailableError`.
   */
  async exchangeCode(code: string): Promise<string> {
    const { clientId, clientSecret } = this.credentials();
    const body = await fetchJson<unknown>(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: githubCallbackUrl(this.env.APP_URL),
      }),
      logger: this.logger,
    });
    const result = parseUpstream(tokenResponseSchema, body, GITHUB_TOKEN_URL);
    if ('access_token' in result) return result.access_token;

    // Only GitHub's error code is logged — never the code, the secret or a token.
    this.logger.warn(
      { upstream: { url: GITHUB_TOKEN_URL, error: result.error } },
      'github code exchange refused',
    );
    if (result.error === 'bad_verification_code') {
      throw new BadRequestError('The GitHub authorization code is invalid or expired');
    }
    throw new ServiceUnavailableError(undefined, {
      cause: { reason: 'oauth_error', url: GITHUB_TOKEN_URL, error: result.error },
    });
  }

  /** Reads `/user` and `/user/emails` concurrently; both must succeed. */
  async fetchIdentity(accessToken: string): Promise<GithubIdentity> {
    const init = {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${accessToken}`,
        'user-agent': this.env.APP_NAME,
        'x-github-api-version': '2022-11-28',
      },
      logger: this.logger,
    };
    const [userBody, emailsBody] = await Promise.all([
      fetchJson<unknown>(GITHUB_USER_URL, init),
      fetchJson<unknown>(GITHUB_EMAILS_URL, init),
    ]);
    const user = parseUpstream(userSchema, userBody, GITHUB_USER_URL);
    const emails = parseUpstream(emailsSchema, emailsBody, GITHUB_EMAILS_URL);

    const primary = emails.find((entry) => entry.primary && entry.verified);
    if (!primary) throw new NoVerifiedEmailError();

    return {
      githubId: String(user.id),
      login: user.login,
      email: primary.email.trim().toLowerCase(),
      avatarUrl: user.avatar_url ?? null,
    };
  }

  private credentials(): { clientId: string; clientSecret: string } {
    const { GITHUB_CLIENT_ID: clientId, GITHUB_CLIENT_SECRET: clientSecret } = this.env;
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableError('GitHub sign-in is not configured');
    }
    return { clientId, clientSecret };
  }
}
