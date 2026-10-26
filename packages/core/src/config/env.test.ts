import { describe, expect, expectTypeOf, it } from 'vitest';
import { ZodError } from 'zod';
import { getEnv, parseAppEnv, type AppEnv, type RawEnv } from './env';

const secret = 's'.repeat(32);

/** Production-shaped env: everything a real deploy sets, minus the integration signal. */
const production = {
  NODE_ENV: 'production',
  APP_URL: 'https://devmentor.example',
  SESSION_SECRET: secret,
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  OPERATOR_EMAILS: 'founder@devmentor.example',
  MAILER_ADAPTER: 'resend',
  MAIL_API_KEY: 'mail-key',
  MAIL_FROM: 'DevMentor <hello@devmentor.example>',
} as const;

function issuesFor(env: RawEnv) {
  try {
    parseAppEnv(env);
  } catch (error) {
    expect(error).toBeInstanceOf(ZodError);
    return (error as ZodError).issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }
  throw new Error('expected the environment to be rejected');
}

describe('parseAppEnv', () => {
  it('parses an all-absent environment with defaults', () => {
    const env = parseAppEnv({});
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      APP_URL: 'http://localhost:3000',
      OPERATOR_EMAILS: [],
      TRUSTED_PROXY_HOPS: 0,
      PASSWORD_HASH_CONCURRENCY: 4,
      PASSWORD_HASH_WAIT_MS: 5000,
      AUTH_IDENTITY_ADAPTER: 'github',
      INTEGRATION_TEST_RUN: false,
    });
    for (const key of [
      'SESSION_SECRET',
      'SESSION_SECRET_PREVIOUS',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'MAILER_ADAPTER',
      'MAIL_API_KEY',
      'MAIL_FROM',
    ] as const) {
      expect(env[key]).toBeUndefined();
    }
    expectTypeOf(env.SESSION_SECRET).toEqualTypeOf<string | undefined>();
    expectTypeOf(env.OPERATOR_EMAILS).toEqualTypeOf<string[]>();
  });

  it('parses a production-shaped environment without a test signal', () => {
    const env = parseAppEnv({ ...production, SESSION_SECRET_PREVIOUS: 'p'.repeat(40), TRUSTED_PROXY_HOPS: '2' });
    expect(env).toMatchObject({
      NODE_ENV: 'production',
      SESSION_SECRET: secret,
      SESSION_SECRET_PREVIOUS: 'p'.repeat(40),
      TRUSTED_PROXY_HOPS: 2,
      MAILER_ADAPTER: 'resend',
      INTEGRATION_TEST_RUN: false,
    });
  });

  it('treats blank assignments as unset', () => {
    const env = parseAppEnv({
      SESSION_SECRET: '',
      APP_URL: '',
      TRUSTED_PROXY_HOPS: '',
      AUTH_IDENTITY_ADAPTER: '',
      MAILER_ADAPTER: '',
      INTEGRATION_TEST_RUN: '',
      GITHUB_CLIENT_ID: '',
    });
    expect(env.SESSION_SECRET).toBeUndefined();
    expect(env.APP_URL).toBe('http://localhost:3000');
    expect(env.TRUSTED_PROXY_HOPS).toBe(0);
    expect(env.AUTH_IDENTITY_ADAPTER).toBe('github');
    expect(env.MAILER_ADAPTER).toBeUndefined();
    expect(env.INTEGRATION_TEST_RUN).toBe(false);
    expect(env.GITHUB_CLIENT_ID).toBeUndefined();
  });

  it('rejects a session secret shorter than 32 characters', () => {
    expect(issuesFor({ SESSION_SECRET: 's'.repeat(31) })).toEqual([
      expect.objectContaining({ path: 'SESSION_SECRET' }),
    ]);
    expect(issuesFor({ SESSION_SECRET_PREVIOUS: 'short' })).toEqual([
      expect.objectContaining({ path: 'SESSION_SECRET_PREVIOUS' }),
    ]);
  });

  it('trims, lowercases and drops empty operator emails', () => {
    expect(
      parseAppEnv({ OPERATOR_EMAILS: ' Founder@DevMentor.test, ,second@devmentor.test,' })
        .OPERATOR_EMAILS,
    ).toEqual(['founder@devmentor.test', 'second@devmentor.test']);
  });

  it('rejects a malformed operator email', () => {
    expect(issuesFor({ OPERATOR_EMAILS: 'founder@devmentor.test,not-an-email' })).toEqual([
      expect.objectContaining({ path: 'OPERATOR_EMAILS.1' }),
    ]);
  });

  it('parses the password hashing gate settings, blanks falling back to defaults', () => {
    expect(
      parseAppEnv({ PASSWORD_HASH_CONCURRENCY: '2', PASSWORD_HASH_WAIT_MS: '0' }),
    ).toMatchObject({ PASSWORD_HASH_CONCURRENCY: 2, PASSWORD_HASH_WAIT_MS: 0 });
    expect(
      parseAppEnv({ PASSWORD_HASH_CONCURRENCY: '', PASSWORD_HASH_WAIT_MS: '' }),
    ).toMatchObject({ PASSWORD_HASH_CONCURRENCY: 4, PASSWORD_HASH_WAIT_MS: 5000 });
  });

  it.each([
    ['PASSWORD_HASH_CONCURRENCY', '0'],
    ['PASSWORD_HASH_CONCURRENCY', '1.5'],
    ['PASSWORD_HASH_WAIT_MS', '-1'],
    ['PASSWORD_HASH_WAIT_MS', 'soon'],
  ])('rejects %s=%s', (key, value) => {
    expect(issuesFor({ [key]: value })).toEqual([expect.objectContaining({ path: key })]);
  });

  it.each(['-1', '1.5', 'many'])('rejects TRUSTED_PROXY_HOPS=%s', (hops) => {
    expect(issuesFor({ TRUSTED_PROXY_HOPS: hops })).toEqual([
      expect.objectContaining({ path: 'TRUSTED_PROXY_HOPS' }),
    ]);
  });

  it('rejects an invalid APP_URL and unknown adapter names', () => {
    expect(issuesFor({ APP_URL: 'not a url' })).toEqual([
      expect.objectContaining({ path: 'APP_URL' }),
    ]);
    expect(issuesFor({ AUTH_IDENTITY_ADAPTER: 'gitlab' })).toEqual([
      expect.objectContaining({ path: 'AUTH_IDENTITY_ADAPTER' }),
    ]);
    expect(issuesFor({ MAILER_ADAPTER: 'smtp' })).toEqual([
      expect.objectContaining({ path: 'MAILER_ADAPTER' }),
    ]);
    expect(issuesFor({ INTEGRATION_TEST_RUN: 'true' })).toEqual([
      expect.objectContaining({ path: 'INTEGRATION_TEST_RUN' }),
    ]);
  });

  describe('fake adapters in a production-shaped environment', () => {
    const mockIdentity = {
      path: 'AUTH_IDENTITY_ADAPTER',
      message: 'AUTH_IDENTITY_ADAPTER=mock is only allowed with INTEGRATION_TEST_RUN=1',
    };
    const logMailer = {
      path: 'MAILER_ADAPTER',
      message: 'MAILER_ADAPTER=log is only allowed with INTEGRATION_TEST_RUN=1',
    };

    it.each([
      ['mock identity, no signal', { AUTH_IDENTITY_ADAPTER: 'mock' }, [mockIdentity]],
      ['log mailer, no signal', { MAILER_ADAPTER: 'log' }, [logMailer]],
      [
        'both fakes, no signal',
        { AUTH_IDENTITY_ADAPTER: 'mock', MAILER_ADAPTER: 'log' },
        [mockIdentity, logMailer],
      ],
      [
        'mock identity, signal 0',
        { AUTH_IDENTITY_ADAPTER: 'mock', INTEGRATION_TEST_RUN: '0' },
        [mockIdentity],
      ],
      ['log mailer, signal 0', { MAILER_ADAPTER: 'log', INTEGRATION_TEST_RUN: '0' }, [logMailer]],
    ])('rejects %s', (_name, overrides, expected) => {
      expect(issuesFor({ ...production, ...overrides })).toEqual(expected);
    });

    it('accepts both fakes with INTEGRATION_TEST_RUN=1', () => {
      const env = parseAppEnv({
        ...production,
        AUTH_IDENTITY_ADAPTER: 'mock',
        MAILER_ADAPTER: 'log',
        INTEGRATION_TEST_RUN: '1',
      });
      expect(env).toMatchObject({
        AUTH_IDENTITY_ADAPTER: 'mock',
        MAILER_ADAPTER: 'log',
        INTEGRATION_TEST_RUN: true,
      });
    });
  });
});

describe('getEnv', () => {
  it('parses on first call and memoises the result', () => {
    const first: AppEnv = getEnv({ APP_NAME: 'First' });
    expect(first.APP_NAME).toBe('First');
    expect(getEnv({ APP_NAME: 'Second' })).toBe(first);
    expect(getEnv()).toBe(first);
  });
});
