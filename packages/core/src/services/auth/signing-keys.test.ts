import { describe, expect, it } from 'vitest';
import { ServiceUnavailableError } from '../../http/errors';
import { JWT_ALGORITHM, signingKeys } from './signing-keys';

const encode = (secret: string) => new TextEncoder().encode(secret);

describe('signingKeys', () => {
  it('pins HS256', () => {
    expect(JWT_ALGORITHM).toBe('HS256');
  });

  it('returns only the current key when no previous secret is set', () => {
    expect(signingKeys({ SESSION_SECRET: 'c'.repeat(32) }, 'off')).toEqual([encode('c'.repeat(32))]);
  });

  it('returns the current key first, then the previous one', () => {
    expect(
      signingKeys({ SESSION_SECRET: 'c'.repeat(32), SESSION_SECRET_PREVIOUS: 'p'.repeat(32) }, 'off'),
    ).toEqual([encode('c'.repeat(32)), encode('p'.repeat(32))]);
  });

  it('throws ServiceUnavailableError with the caller message when SESSION_SECRET is unset', () => {
    const attempt = () => signingKeys({ SESSION_SECRET_PREVIOUS: 'p'.repeat(32) }, 'Not configured');
    expect(attempt).toThrow(ServiceUnavailableError);
    expect(attempt).toThrow('Not configured');
  });
});
