import { describe, expect, it } from 'vitest';
import { verifyEmailSchema } from './verify-email.schema';

describe('verifyEmailSchema', () => {
  it('keeps the exact chosen password and only accepts token plus password', () => {
    expect(verifyEmailSchema.parse({
      token: 'signed-link',
      password: ' final password ',
      returnTo: '//external.example',
    })).toEqual({ token: 'signed-link', password: ' final password ' });
  });

  it.each([
    {},
    { token: '', password: 'valid final password' },
    { token: 'signed-link', password: 'short' },
    { token: 'signed-link', password: 'a'.repeat(73) },
    { token: 'signed-link', password: 'ł'.repeat(37) },
    { token: 1, password: 'valid final password' },
    { token: 'signed-link', password: null },
  ])('rejects invalid completion input %j', (input) => {
    expect(verifyEmailSchema.safeParse(input).success).toBe(false);
  });

  it('accepts the shared 12-character minimum and 72-byte maximum', () => {
    for (const password of ['a'.repeat(12), 'ł'.repeat(36), 'a'.repeat(72)]) {
      expect(verifyEmailSchema.safeParse({ token: 'signed-link', password }).success).toBe(true);
    }
  });
});
