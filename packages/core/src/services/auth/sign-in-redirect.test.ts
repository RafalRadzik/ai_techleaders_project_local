import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestError, ServiceUnavailableError } from '../../http/errors';
import { NoVerifiedEmailError } from './github-identity.port';
import {
  SIGN_IN_CANCELLED_LOCATION,
  SIGN_IN_ERRORS,
  signInErrorLocation,
  signInFailure,
} from './sign-in-redirect';
import { AccountNotLinkedError } from './user.service';

const log = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock('@devmentor/db', () => ({
  User: {},
  USER_ROLES: ['mentee', 'mentor', 'operator'],
  LockMode: {},
  UniqueConstraintViolationException: class {},
}));
vi.mock('../../logger', () => ({ createLogger: () => log }));

beforeEach(() => {
  vi.clearAllMocks();
});

function location(error: unknown, cookies?: string[]) {
  const response = signInFailure(error, cookies);
  expect(response.status).toBe(302);
  return response.headers.get('location');
}

describe('sign-in redirect targets', () => {
  it('builds /sign-in locations', () => {
    expect(SIGN_IN_CANCELLED_LOCATION).toBe('/sign-in?cancelled=1');
    expect(SIGN_IN_ERRORS.map(signInErrorLocation)).toEqual([
      '/sign-in?error=unavailable',
      '/sign-in?error=state',
      '/sign-in?error=no_verified_email',
      '/sign-in?error=email_unverified',
      '/sign-in?error=github_account_mismatch',
      '/sign-in?error=no_active_role',
    ]);
  });
});

describe('signInFailure', () => {
  it('maps refusals to their own codes and logs them at info', () => {
    expect(location(new NoVerifiedEmailError())).toBe('/sign-in?error=no_verified_email');
    expect(location(new AccountNotLinkedError('email_unverified'))).toBe(
      '/sign-in?error=email_unverified',
    );
    expect(location(new AccountNotLinkedError('github_account_mismatch'))).toBe(
      '/sign-in?error=github_account_mismatch',
    );
    expect(location(new BadRequestError('bad code'))).toBe('/sign-in?error=state');
    expect(log.info).toHaveBeenCalledTimes(4);
    expect(log.error).not.toHaveBeenCalled();
  });

  it('reports an unconfigured or failing upstream as unavailable, at warn', () => {
    expect(location(new ServiceUnavailableError())).toBe('/sign-in?error=unavailable');
    expect(log.warn).toHaveBeenCalledOnce();
    expect(log.error).not.toHaveBeenCalled();
  });

  it('logs anything unexpected at error and still redirects, never JSON', () => {
    const response = signInFailure(new Error('db down'));
    expect(response.headers.get('location')).toBe('/sign-in?error=unavailable');
    expect(response.headers.get('content-type')).toBeNull();
    expect(log.error).toHaveBeenCalledOnce();
  });

  it('carries the given cookies', () => {
    const response = signInFailure(new Error('x'), ['a=; Max-Age=0']);
    expect(response.headers.getSetCookie()).toEqual(['a=; Max-Age=0']);
  });
});
