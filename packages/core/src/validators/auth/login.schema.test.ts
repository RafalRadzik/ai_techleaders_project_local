import { describe, expect, it } from 'vitest';
import { loginSchema } from './login.schema';
import { PASSWORD_TOO_LONG_MESSAGE } from './register.schema';

const valid = { email: 'ada@example.com', password: 'x' };

function messagesFor(input: Record<string, unknown>, field: string): string[] {
  const result = loginSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.filter((issue) => issue.path[0] === field).map((issue) => issue.message);
}

describe('loginSchema', () => {
  it('accepts a short password: the length rule belongs to registration', () => {
    expect(loginSchema.parse(valid)).toEqual(valid);
  });

  it('keeps an optional returnTo', () => {
    expect(loginSchema.parse({ ...valid, returnTo: '/home' }).returnTo).toBe('/home');
  });

  it('normalises the email', () => {
    expect(loginSchema.parse({ ...valid, email: ' ADA@example.com ' }).email).toBe('ada@example.com');
  });

  it('rejects a malformed email', () => {
    expect(messagesFor({ ...valid, email: 'ada' }, 'email')).toContain(
      'Enter an email address in the form name@example.com.',
    );
  });

  it('asks for a password when it is empty', () => {
    expect(messagesFor({ ...valid, password: '' }, 'password')).toEqual(['Enter your password.']);
  });

  it('accepts 72 bytes and rejects 73', () => {
    expect(loginSchema.safeParse({ ...valid, password: 'a'.repeat(72) }).success).toBe(true);
    expect(messagesFor({ ...valid, password: 'a'.repeat(73) }, 'password')).toEqual([
      PASSWORD_TOO_LONG_MESSAGE,
    ]);
  });

  it('rejects a multibyte password over 72 bytes but under 72 characters', () => {
    expect(messagesFor({ ...valid, password: '😀'.repeat(19) }, 'password')).toEqual([
      PASSWORD_TOO_LONG_MESSAGE,
    ]);
  });
});
