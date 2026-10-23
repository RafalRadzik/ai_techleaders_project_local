import { describe, expect, it } from 'vitest';
import {
  PASSWORD_TOO_LONG_MESSAGE,
  registerSchema,
  utf8ByteLength,
} from './register.schema';

const valid = {
  email: 'ada@example.com',
  password: 'correct horse battery',
  displayName: 'Ada Lovelace',
};

function messagesFor(input: Record<string, unknown>, field: string): string[] {
  const result = registerSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.filter((issue) => issue.path[0] === field).map((issue) => issue.message);
}

describe('utf8ByteLength', () => {
  it('counts bytes, not characters', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('ł')).toBe(2);
    expect(utf8ByteLength('😀')).toBe(4);
  });
});

describe('registerSchema', () => {
  it('accepts a valid payload without returnTo', () => {
    expect(registerSchema.parse(valid)).toEqual(valid);
  });

  it('keeps an optional returnTo as given', () => {
    expect(registerSchema.parse({ ...valid, returnTo: '/mentors' }).returnTo).toBe('/mentors');
  });

  it('rejects a non-string returnTo', () => {
    expect(registerSchema.safeParse({ ...valid, returnTo: 42 }).success).toBe(false);
  });

  it('trims and lowercases the email, idempotently', () => {
    const parsed = registerSchema.parse({ ...valid, email: '  Ada@Example.COM ' });
    expect(parsed.email).toBe('ada@example.com');
    expect(registerSchema.parse(parsed)).toEqual(parsed);
  });

  it.each(['not-an-email', 'ada@', '@example.com', 'ada example@x.com'])('rejects %j', (email) => {
    expect(messagesFor({ ...valid, email }, 'email')).toContain(
      'Enter an email address in the form name@example.com.',
    );
  });

  it('asks for an email when it is blank', () => {
    expect(messagesFor({ ...valid, email: '   ' }, 'email')).toContain('Enter your email address.');
  });

  it('rejects a password of 11 characters and accepts 12', () => {
    expect(messagesFor({ ...valid, password: 'a'.repeat(11) }, 'password')).toEqual([
      'Use a password of at least 12 characters.',
    ]);
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(12) }).success).toBe(true);
  });

  it('accepts exactly 72 bytes and rejects 73', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(72) }).success).toBe(true);
    expect(messagesFor({ ...valid, password: 'a'.repeat(73) }, 'password')).toEqual([
      PASSWORD_TOO_LONG_MESSAGE,
    ]);
  });

  it('rejects a multibyte password under 72 characters but over 72 bytes', () => {
    const password = 'ł'.repeat(37);
    expect(password.length).toBe(37);
    expect(utf8ByteLength(password)).toBe(74);
    expect(messagesFor({ ...valid, password }, 'password')).toEqual([PASSWORD_TOO_LONG_MESSAGE]);
  });

  it('does not trim the password', () => {
    const password = '  spaced secret  ';
    expect(registerSchema.parse({ ...valid, password }).password).toBe(password);
  });

  it('trims the display name and rejects whitespace only', () => {
    expect(registerSchema.parse({ ...valid, displayName: '  Ada  ' }).displayName).toBe('Ada');
    expect(messagesFor({ ...valid, displayName: '   ' }, 'displayName')).toEqual([
      'Enter the name other people will see.',
    ]);
  });

  it('accepts a 120-character display name and rejects 121', () => {
    expect(registerSchema.safeParse({ ...valid, displayName: 'a'.repeat(120) }).success).toBe(true);
    expect(messagesFor({ ...valid, displayName: 'a'.repeat(121) }, 'displayName')).toEqual([
      'Keep your name to 120 characters or fewer.',
    ]);
  });

  it('requires every field except returnTo', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      'displayName',
      'email',
      'password',
    ]);
  });
});
