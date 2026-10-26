import { SEED_PASSWORD, SEED_PASSWORD_HASH } from '@devmentor/db/seeders';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseAppEnv } from '../../config/env';
import { ServiceUnavailableError } from '../../http/errors';
import {
  PasswordService,
  SCRYPT_KEY_LENGTH,
  SCRYPT_MAXMEM,
  SCRYPT_N,
  SCRYPT_P,
  SCRYPT_R,
  SCRYPT_SALT_LENGTH,
  scryptAsync,
} from './password.service';

function service(concurrency = 2, waitMs = 1000): PasswordService {
  return new PasswordService({
    env: parseAppEnv({
      PASSWORD_HASH_CONCURRENCY: String(concurrency),
      PASSWORD_HASH_WAIT_MS: String(waitMs),
    }),
  });
}

/** A `withSlot` body the test finishes by hand, recording when it was admitted. */
function heldSlot(passwords: PasswordService, log: string[], name: string) {
  let finish!: () => void;
  const done = passwords.withSlot(
    () =>
      new Promise<string>((resolve) => {
        log.push(name);
        finish = () => resolve(name);
      }),
  );
  return { done, finish: () => finish() };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

// Each real derivation costs ~128 MiB and a few hundred milliseconds, so these run one
// at a time with a generous timeout and are kept to a handful.
describe('PasswordService hashing', { timeout: 20_000 }, () => {
  const passwords = service();

  it('hashes into the stored format and verifies only the right password', async () => {
    const hash = await passwords.hash('correct horse battery');
    expect(hash).not.toContain('correct horse battery');
    const match = /^scrypt\$N=131072,r=8,p=1\$([A-Za-z0-9+/]+=*)\$([A-Za-z0-9+/]+=*)$/.exec(hash);
    expect(match).not.toBeNull();
    expect(Buffer.from(match![1]!, 'base64')).toHaveLength(SCRYPT_SALT_LENGTH);
    expect(Buffer.from(match![2]!, 'base64')).toHaveLength(SCRYPT_KEY_LENGTH);

    await expect(passwords.verify('correct horse battery', hash)).resolves.toBe(true);
    await expect(passwords.verify('wrong horse battery', hash)).resolves.toBe(false);
  });

  it("verifies the seeder's stored development hash", async () => {
    await expect(passwords.verify(SEED_PASSWORD, SEED_PASSWORD_HASH)).resolves.toBe(true);
  });

  it('never verifies a null hash, yet spends a full derivation on it', async () => {
    const started = performance.now();
    await expect(passwords.verify(SEED_PASSWORD, null)).resolves.toBe(false);
    // A real N=2^17 derivation; an early `return false` would take well under a millisecond.
    expect(performance.now() - started).toBeGreaterThan(10);
  });

  it.each([
    ['another scheme', 'bcrypt$12$abc'],
    ['missing parts', 'scrypt$N=131072,r=8,p=1$c2FsdA=='],
    ['a non-canonical salt', 'scrypt$N=131072,r=8,p=1$YQ=$a2V5'],
    ['an empty key', 'scrypt$N=131072,r=8,p=1$c2FsdA==$A'],
  ])('returns false for a hash with %s', async (_label, stored) => {
    await expect(passwords.verify(SEED_PASSWORD, stored)).resolves.toBe(false);
  });

  it('returns false when the stored parameters are ones scrypt refuses', async () => {
    // N must be a power of two; scrypt rejects before doing any work.
    await expect(passwords.verify(SEED_PASSWORD, 'scrypt$N=3,r=8,p=1$c2FsdA==$a2V5')).resolves.toBe(
      false,
    );
  });

  it('needs the explicit maxmem raise: Node refuses these parameters at its default', async () => {
    // Regression: without `maxmem`, every hash and verify would throw.
    const params = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P };
    await expect(scryptAsync('x', 'salt', SCRYPT_KEY_LENGTH, params)).rejects.toMatchObject({
      code: 'ERR_CRYPTO_INVALID_SCRYPT_PARAMS',
    });
    // Even exactly 128·N·r is not enough; the constant leaves headroom.
    expect(SCRYPT_MAXMEM).toBeGreaterThan(128 * SCRYPT_N * SCRYPT_R);
    await expect(
      scryptAsync('x', 'salt', SCRYPT_KEY_LENGTH, {
        ...params,
        maxmem: 128 * SCRYPT_N * SCRYPT_R,
      }),
    ).rejects.toMatchObject({ code: 'ERR_CRYPTO_INVALID_SCRYPT_PARAMS' });
  });
});

describe('PasswordService concurrency gate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('admits up to the limit, queues the rest, and admits them in FIFO order', async () => {
    const passwords = service(2, 1000);
    const log: string[] = [];
    const a = heldSlot(passwords, log, 'a');
    const b = heldSlot(passwords, log, 'b');
    const c = heldSlot(passwords, log, 'c');
    const d = heldSlot(passwords, log, 'd');
    await flush();
    expect(log).toEqual(['a', 'b']);

    b.finish();
    await expect(b.done).resolves.toBe('b');
    await flush();
    expect(log).toEqual(['a', 'b', 'c']);

    a.finish();
    await flush();
    expect(log).toEqual(['a', 'b', 'c', 'd']);
    c.finish();
    d.finish();
    await expect(Promise.all([a.done, c.done, d.done])).resolves.toEqual(['a', 'c', 'd']);
  });

  it('throws ServiceUnavailableError past the wait and leaves the gate usable', async () => {
    vi.useFakeTimers();
    const passwords = service(1, 5000);
    const log: string[] = [];
    const first = heldSlot(passwords, log, 'first');
    const late = vi.fn();
    const timedOut = passwords.withSlot(late);
    const rejection = expect(timedOut).rejects.toBeInstanceOf(ServiceUnavailableError);

    await vi.advanceTimersByTimeAsync(4999);
    expect(late).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    await expect(timedOut).rejects.toMatchObject({
      status: 503,
      code: 'service_unavailable',
    });
    expect(late).not.toHaveBeenCalled();

    // The timed-out waiter left the queue, so releasing frees the slot outright.
    first.finish();
    await first.done;
    await expect(passwords.withSlot(async () => 'next')).resolves.toBe('next');
  });

  it('releases the slot when the body throws', async () => {
    const passwords = service(1, 0);
    await expect(
      passwords.withSlot(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(passwords.withSlot(async () => 'after')).resolves.toBe('after');
  });

  it('runs hash and verify inside a slot, so a saturated gate answers 503 without hashing', async () => {
    const passwords = service(1, 0);
    const log: string[] = [];
    const held = heldSlot(passwords, log, 'held');
    await expect(passwords.hash('anything')).rejects.toBeInstanceOf(ServiceUnavailableError);
    await expect(passwords.verify('anything', null)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    held.finish();
    await held.done;
  });
});
