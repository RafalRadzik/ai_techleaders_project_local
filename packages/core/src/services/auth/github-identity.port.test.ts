import { describe, expect, it } from 'vitest';
import { ForbiddenError } from '../../http/errors';
import {
  GITHUB_LOGIN_PATTERN,
  githubCallbackUrl,
  NoVerifiedEmailError,
} from './github-identity.port';

describe('github identity port', () => {
  it('builds the callback URL with or without a trailing slash on APP_URL', () => {
    expect(githubCallbackUrl('https://devmentor.example')).toBe(
      'https://devmentor.example/api/auth/github/callback',
    );
    expect(githubCallbackUrl('https://devmentor.example//')).toBe(
      'https://devmentor.example/api/auth/github/callback',
    );
  });

  it('accepts GitHub-shaped logins only', () => {
    expect(GITHUB_LOGIN_PATTERN.test('mock-mentee')).toBe(true);
    expect(GITHUB_LOGIN_PATTERN.test('a'.repeat(39))).toBe(true);
    expect(GITHUB_LOGIN_PATTERN.test('a'.repeat(40))).toBe(false);
    expect(GITHUB_LOGIN_PATTERN.test('')).toBe(false);
    expect(GITHUB_LOGIN_PATTERN.test('a_b')).toBe(false);
  });

  it('refuses an account without a verified email as a forbidden error', () => {
    const error = new NoVerifiedEmailError();
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toMatchObject({
      status: 403,
      code: 'forbidden',
      name: 'NoVerifiedEmailError',
      message: 'Your GitHub account has no verified primary email address',
    });
  });
});
