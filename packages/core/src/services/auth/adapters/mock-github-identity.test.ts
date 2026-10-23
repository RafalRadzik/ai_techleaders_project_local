import { describe, expect, it } from 'vitest';
import { parseAppEnv } from '../../../config/env';
import { BadRequestError } from '../../../http/errors';
import { MOCK_DEFAULT_LOGIN, mockGithubId, MockGithubIdentityAdapter } from './mock-github-identity';

const adapter = new MockGithubIdentityAdapter({
  env: parseAppEnv({ APP_URL: 'http://127.0.0.1:4100/' }),
});

async function signIn(login?: string) {
  const url = new URL(adapter.authorizeUrl({ state: 'st', login }));
  const token = await adapter.exchangeCode(url.searchParams.get('code')!);
  return adapter.fetchIdentity(token);
}

describe('MockGithubIdentityAdapter', () => {
  it('sends the browser straight to our own callback with the login as code', () => {
    const url = new URL(adapter.authorizeUrl({ state: 'signed state', login: 'mock-operator' }));
    expect(`${url.origin}${url.pathname}`).toBe('http://127.0.0.1:4100/api/auth/github/callback');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      code: 'mock-operator',
      state: 'signed state',
    });
  });

  it('defaults to the mock-mentee persona', async () => {
    expect(MOCK_DEFAULT_LOGIN).toBe('mock-mentee');
    await expect(signIn()).resolves.toEqual({
      githubId: mockGithubId('mock-mentee'),
      login: 'mock-mentee',
      email: 'mock-mentee@devmentor.test',
      avatarUrl: null,
    });
  });

  it('derives the same identity for the same login', async () => {
    const first = await signIn('mock-mentor');
    expect(await signIn('mock-mentor')).toEqual(first);
    expect(first).toMatchObject({ login: 'mock-mentor', email: 'mock-mentor@devmentor.test' });
    expect(first.githubId).toMatch(/^\d+$/);
  });

  it('derives two different identities for two logins', async () => {
    const mentee = await signIn('mock-mentee');
    const operator = await signIn('mock-operator');
    expect(operator.githubId).not.toBe(mentee.githubId);
    expect(operator.email).not.toBe(mentee.email);
  });

  it('treats logins case-insensitively and lowercases the email', async () => {
    const identity = await signIn('Mock-Mentor');
    expect(identity.githubId).toBe(mockGithubId('mock-mentor'));
    expect(identity.email).toBe('mock-mentor@devmentor.test');
  });

  it('keeps mock ids clear of real GitHub ids', () => {
    expect(Number(mockGithubId('a'))).toBeGreaterThanOrEqual(9_000_000_000);
  });

  it.each([
    ['an invalid login hint', () => adapter.authorizeUrl({ state: 's', login: 'a b' })],
    ['an invalid code', () => adapter.exchangeCode('../evil')],
    ['a token without the mock prefix', () => adapter.fetchIdentity('gho_real')],
    ['a mock token with an invalid login', () => adapter.fetchIdentity('mock-token:')],
  ])('refuses %s', async (_name, call) => {
    await expect((async () => call())()).rejects.toBeInstanceOf(BadRequestError);
  });
});
