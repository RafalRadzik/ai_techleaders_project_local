import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppEnv, type RawEnv } from '../../../config/env';
import { BadRequestError, ServiceUnavailableError } from '../../../http/errors';
import { NoVerifiedEmailError } from '../github-identity.port';
import {
  GITHUB_EMAILS_URL,
  GITHUB_TOKEN_URL,
  GITHUB_USER_URL,
  GithubIdentityAdapter,
} from './github-identity';

const fetchMock = vi.fn<typeof fetch>();
const logger = { warn: vi.fn() };

const CONFIGURED: RawEnv = {
  APP_URL: 'https://devmentor.example/',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
};

function adapter(overrides: RawEnv = CONFIGURED): GithubIdentityAdapter {
  return new GithubIdentityAdapter({ env: parseAppEnv(overrides), logger });
}

const USER = { id: 583231, login: 'octocat', avatar_url: 'https://avatars.example/u/583231' };
const EMAILS = [
  { email: 'secondary@example.com', primary: false, verified: true },
  { email: 'Octo.Cat@Example.COM', primary: true, verified: true },
];

function routeGithub(responses: Partial<Record<string, () => Promise<Response>>>): void {
  fetchMock.mockImplementation((input) => {
    const respond = responses[String(input)];
    if (!respond) throw new Error(`unexpected fetch ${String(input)}`);
    return respond();
  });
}

const json = (body: unknown, status = 200) => () => Promise.resolve(Response.json(body, { status }));

function hangUntilAborted(_url: unknown, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  logger.warn.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GithubIdentityAdapter.authorizeUrl', () => {
  it('points at GitHub with the client id, callback, scope and state', () => {
    const url = new URL(adapter().authorizeUrl({ state: 'signed-state' }));
    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/login/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-id',
      redirect_uri: 'https://devmentor.example/api/auth/github/callback',
      scope: 'read:user user:email',
      state: 'signed-state',
    });
  });

  it('forwards the login hint to GitHub', () => {
    const url = new URL(adapter().authorizeUrl({ state: 's', login: 'mock-operator' }));
    expect(url.searchParams.get('login')).toBe('mock-operator');
  });

  it('rejects a login hint GitHub could not have issued', () => {
    expect(() => adapter().authorizeUrl({ state: 's', login: 'bad login' })).toThrow(
      BadRequestError,
    );
  });

  it.each([
    ['no client id', { GITHUB_CLIENT_SECRET: 'client-secret' }],
    ['no client secret', { GITHUB_CLIENT_ID: 'client-id' }],
  ])('is unavailable with %s', (_name, env) => {
    expect(() => adapter(env).authorizeUrl({ state: 's' })).toThrow(ServiceUnavailableError);
  });
});

describe('GithubIdentityAdapter.exchangeCode', () => {
  it('posts the code and credentials as JSON and returns the access token', async () => {
    routeGithub({ [GITHUB_TOKEN_URL]: json({ access_token: 'gho_token', token_type: 'bearer' }) });

    await expect(adapter().exchangeCode('the-code')).resolves.toBe('gho_token');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init).toMatchObject({
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      client_id: 'client-id',
      client_secret: 'client-secret',
      code: 'the-code',
      redirect_uri: 'https://devmentor.example/api/auth/github/callback',
    });
  });

  it('treats a 200 bad_verification_code answer as a bad request, logging no secrets', async () => {
    routeGithub({
      [GITHUB_TOKEN_URL]: json({
        error: 'bad_verification_code',
        error_description: 'The code passed is incorrect or expired.',
      }),
    });

    await expect(adapter().exchangeCode('the-code')).rejects.toBeInstanceOf(BadRequestError);
    const logged = JSON.stringify(logger.warn.mock.calls);
    expect(logged).toContain('bad_verification_code');
    expect(logged).not.toContain('the-code');
    expect(logged).not.toContain('client-secret');
  });

  it('treats any other 200 error answer as the integration being unavailable', async () => {
    routeGithub({ [GITHUB_TOKEN_URL]: json({ error: 'incorrect_client_credentials' }) });

    const error = await adapter().exchangeCode('c').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect((error as Error).cause).toMatchObject({ error: 'incorrect_client_credentials' });
  });

  it('is unavailable when the answer has neither a token nor an error', async () => {
    routeGithub({ [GITHUB_TOKEN_URL]: json({ token_type: 'bearer' }) });
    await expect(adapter().exchangeCode('c')).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('is unavailable on an upstream 5xx', async () => {
    routeGithub({ [GITHUB_TOKEN_URL]: json({ message: 'down' }, 502) });
    await expect(adapter().exchangeCode('c')).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('is unavailable when GitHub hangs past the 10 s timeout', async () => {
    // Keep fetchJson's real 10 s budget observable while expiring it after 5 ms.
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(5));
    fetchMock.mockImplementation(hangUntilAborted);

    const error = await adapter().exchangeCode('c').catch((e: unknown) => e);

    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect((error as Error).cause).toMatchObject({ reason: 'timeout' });
  });

  it('is unavailable without credentials and calls nothing', async () => {
    await expect(adapter({}).exchangeCode('c')).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('GithubIdentityAdapter.fetchIdentity', () => {
  it('returns the id, login, lowercased primary verified email and avatar', async () => {
    routeGithub({ [GITHUB_USER_URL]: json(USER), [GITHUB_EMAILS_URL]: json(EMAILS) });

    await expect(adapter().fetchIdentity('gho_token')).resolves.toEqual({
      githubId: '583231',
      login: 'octocat',
      email: 'octo.cat@example.com',
      avatarUrl: 'https://avatars.example/u/583231',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.headers).toMatchObject({
        accept: 'application/vnd.github+json',
        authorization: 'Bearer gho_token',
        'user-agent': 'DevMentor',
      });
    }
  });

  it('maps a missing avatar to null', async () => {
    routeGithub({
      [GITHUB_USER_URL]: json({ id: 1, login: 'ghost', avatar_url: null }),
      [GITHUB_EMAILS_URL]: json(EMAILS),
    });
    await expect(adapter().fetchIdentity('t')).resolves.toMatchObject({ avatarUrl: null });
  });

  it.each([
    ['the primary email is unverified', [{ email: 'a@example.com', primary: true, verified: false }]],
    ['only a secondary email is verified', [{ email: 'a@example.com', primary: false, verified: true }]],
    ['there are no emails', []],
  ])('refuses when %s', async (_name, emails) => {
    routeGithub({ [GITHUB_USER_URL]: json(USER), [GITHUB_EMAILS_URL]: json(emails) });
    await expect(adapter().fetchIdentity('t')).rejects.toBeInstanceOf(NoVerifiedEmailError);
  });

  it('is unavailable when either call answers 5xx', async () => {
    routeGithub({ [GITHUB_USER_URL]: json(USER), [GITHUB_EMAILS_URL]: json({}, 503) });
    await expect(adapter().fetchIdentity('t')).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it.each([
    ['user', { [GITHUB_USER_URL]: json({ login: 'octocat' }), [GITHUB_EMAILS_URL]: json(EMAILS) }],
    ['emails', { [GITHUB_USER_URL]: json(USER), [GITHUB_EMAILS_URL]: json({ email: 'x' }) }],
  ])('is unavailable when the %s body has an unexpected shape', async (_name, responses) => {
    routeGithub(responses);
    const error = await adapter().fetchIdentity('t').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect((error as Error).cause).toMatchObject({ reason: 'invalid_response' });
  });

  it('never logs the access token', async () => {
    routeGithub({ [GITHUB_USER_URL]: json({}, 500), [GITHUB_EMAILS_URL]: json({}, 500) });
    await adapter().fetchIdentity('gho_SECRET').catch(() => undefined);
    expect(logger.warn).toHaveBeenCalled();
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('gho_SECRET');
  });
});
