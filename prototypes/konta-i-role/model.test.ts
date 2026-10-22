import { describe, expect, it } from 'vitest';
import { createBackend } from './backend';
import { accessFor, DEMO_PASSWORD, homeFor, registerSchema } from './model';

describe('roles and access', () => {
  it('picks the home by operator, then mentor, then mentee', () => {
    expect(homeFor(['mentee', 'mentor', 'operator'])).toBe('s08');
    expect(homeFor(['mentee', 'mentor'])).toBe('s07');
    expect(homeFor(['mentee'])).toBe('s06');
  });

  it('guards screens by role and leaves public screens open', () => {
    const mentee = { id: 'a', displayName: 'A', email: 'a@x.test', roles: ['mentee' as const] };
    expect(accessFor(null, 's06')).toBe('signed-out');
    expect(accessFor(mentee, 's07')).toBe('forbidden');
    expect(accessFor(mentee, 's06')).toBe('ok');
    expect(accessFor(null, 's02')).toBe('ok');
  });
});

describe('backend happy paths', () => {
  it('signs in with email and password and keeps the failure generic', () => {
    const backend = createBackend();
    expect(backend.login({ email: 'nina@devmentor.test', password: 'wrong' })).toMatchObject({ ok: false, error: { state: 'invalid-credentials' } });
    expect(backend.user()).toBeNull();
    expect(backend.login({ email: 'nina@devmentor.test', password: DEMO_PASSWORD }).ok).toBe(true);
    expect(backend.user()?.displayName).toBe('Nina Demo');
  });

  it('registers without a session and signs in after verification', () => {
    const backend = createBackend();
    expect(backend.register({ displayName: 'Pat Demo', email: 'pat@devmentor.test', password: 'wystarczajaco-dlugie-haslo' })).toEqual({ ok: true, data: { email: 'pat@devmentor.test' } });
    expect(backend.user()).toBeNull();
    expect(backend.verify('pat@devmentor.test', true).ok).toBe(true);
    expect(backend.user()?.roles).toEqual(['mentee']);
  });

  it('creates a mentee account on first GitHub sign-in', () => {
    const backend = createBackend();
    expect(backend.accounts().find((account) => account.id === 'alex')?.exists).toBe(false);
    const result = backend.github('alex');
    expect(result).toMatchObject({ ok: true, data: { created: true } });
    expect(backend.user()?.roles).toEqual(['mentee']);
  });

  it('refuses to register an address that already has a password account', () => {
    expect(createBackend().register({ displayName: 'N', email: 'nina@devmentor.test', password: 'wystarczajaco-dlugie-haslo' })).toMatchObject({ ok: false, error: { state: 'account-exists' } });
  });
});

describe('registration schema', () => {
  it('counts the 72 byte limit in bytes', () => {
    const base = { displayName: 'Pat', email: 'pat@devmentor.test' };
    expect(registerSchema.safeParse({ ...base, password: 'a'.repeat(72) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, password: 'ą'.repeat(37) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
  });
});
