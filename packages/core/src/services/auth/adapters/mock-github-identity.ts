import { createHash } from 'node:crypto';
import type { AppEnv } from '../../../config/env';
import { BadRequestError } from '../../../http/errors';
import {
  GITHUB_LOGIN_PATTERN,
  githubCallbackUrl,
  type AuthorizeUrlInput,
  type GithubIdentity,
  type GithubIdentityPort,
} from '../github-identity.port';

export const MOCK_DEFAULT_LOGIN = 'mock-mentee';
export const MOCK_EMAIL_DOMAIN = 'devmentor.test';
const TOKEN_PREFIX = 'mock-token:';

// Above every real GitHub id, so a mock row can never collide with a real account.
const MOCK_ID_OFFSET = 9_000_000_000;

function assertLogin(login: string): string {
  if (!GITHUB_LOGIN_PATTERN.test(login)) {
    throw new BadRequestError('Invalid mock GitHub login');
  }
  return login;
}

/** A stable numeric id per login; logins are case-insensitive, as on GitHub. */
export function mockGithubId(login: string): string {
  const digest = createHash('sha256').update(login.toLowerCase()).digest();
  return String(MOCK_ID_OFFSET + digest.readUInt32BE(0));
}

/**
 * The integration-harness identity adapter (B14). Selected only when
 * `AUTH_IDENTITY_ADAPTER=mock` and `INTEGRATION_TEST_RUN=1` are both set; it never calls
 * GitHub. The whole identity is derived from the `login` hint: `authorizeUrl` sends the
 * browser straight to our own callback with the login as the `code`, and
 * `fetchIdentity` returns that login with `<login>@devmentor.test` as its verified email.
 */
export class MockGithubIdentityAdapter implements GithubIdentityPort {
  private readonly env: AppEnv;

  constructor({ env }: { env: AppEnv }) {
    this.env = env;
  }

  authorizeUrl({ state, login = MOCK_DEFAULT_LOGIN }: AuthorizeUrlInput): string {
    const url = new URL(githubCallbackUrl(this.env.APP_URL));
    url.searchParams.set('code', assertLogin(login));
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<string> {
    return `${TOKEN_PREFIX}${assertLogin(code)}`;
  }

  async fetchIdentity(accessToken: string): Promise<GithubIdentity> {
    if (!accessToken.startsWith(TOKEN_PREFIX)) {
      throw new BadRequestError('Invalid mock GitHub access token');
    }
    const login = assertLogin(accessToken.slice(TOKEN_PREFIX.length));
    return {
      githubId: mockGithubId(login),
      login,
      email: `${login}@${MOCK_EMAIL_DOMAIN}`.toLowerCase(),
      avatarUrl: null,
    };
  }
}
