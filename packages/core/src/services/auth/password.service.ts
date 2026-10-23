import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';
import type { AppEnv } from '../../config/env';
import { ServiceUnavailableError } from '../../http/errors';

/**
 * scrypt cost parameters (primitive B9). N=2¹⁷, r=8, p=1 is OWASP's recommended scrypt
 * configuration: roughly 128 MiB and a few hundred milliseconds per hash on the libuv
 * threadpool, so login never blocks the main thread the way `bcryptjs` did.
 */
export const SCRYPT_N = 2 ** 17;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
/** Derived key and salt sizes, in bytes. */
export const SCRYPT_KEY_LENGTH = 64;
export const SCRYPT_SALT_LENGTH = 16;
/**
 * Node's default `maxmem` is 32 MiB, and OpenSSL needs a little *more* than 128·N·r =
 * 128 MiB for the parameters above, so without an explicit raise every call throws
 * `ERR_CRYPTO_INVALID_SCRYPT_PARAMS`. 256 MiB leaves headroom and still caps what a
 * stored hash with larger parameters may allocate.
 */
export const SCRYPT_MAXMEM = 256 * 1024 * 1024;

const SCHEME = 'scrypt';
const BASE64 = '[A-Za-z0-9+/]+={0,2}';
const HASH_FORMAT = new RegExp(
  `^${SCHEME}\\$N=(\\d+),r=(\\d+),p=(\\d+)\\$(${BASE64})\\$(${BASE64})$`,
);

/** Salt for the equal-work derivation when there is no stored hash to compare with. */
const DUMMY_SALT = Buffer.alloc(SCRYPT_SALT_LENGTH);

interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

const CURRENT_PARAMS: ScryptParams = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P };

/** The async (libuv threadpool) scrypt; `promisify`'s typings drop the options overload. */
export const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer | string,
  keyLength: number,
  options: ScryptOptions,
) => Promise<Buffer>;

function deriveKey(
  plain: string,
  salt: Buffer,
  keyLength: number,
  params: ScryptParams,
): Promise<Buffer> {
  return scryptAsync(plain, salt, keyLength, {
    ...params,
    maxmem: SCRYPT_MAXMEM,
  });
}

interface ParsedHash {
  params: ScryptParams;
  salt: Buffer;
  key: Buffer;
}

/** Canonical base64 only, so a hash has exactly one accepted spelling. */
function decodeBase64(text: string): Buffer | null {
  const bytes = Buffer.from(text, 'base64');
  return bytes.length > 0 && bytes.toString('base64') === text ? bytes : null;
}

function parseHash(stored: string): ParsedHash | null {
  const match = HASH_FORMAT.exec(stored);
  if (!match) return null;
  // Every group is mandatory in HASH_FORMAT, so a match fills all five.
  const [, n, r, p, saltText, keyText] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const salt = decodeBase64(saltText);
  const key = decodeBase64(keyText);
  if (!salt || !key) return null;
  return { params: { N: Number(n), r: Number(r), p: Number(p) }, salt, key };
}

/** Hashing and verification, available only while a gate slot is held. */
export interface PasswordHashingSlot {
  hash(plain: string): Promise<string>;
  verify(plain: string, stored: string | null): Promise<boolean>;
}

const slot: PasswordHashingSlot = {
  async hash(plain) {
    const salt = randomBytes(SCRYPT_SALT_LENGTH);
    const key = await deriveKey(plain, salt, SCRYPT_KEY_LENGTH, CURRENT_PARAMS);
    const { N, r, p } = CURRENT_PARAMS;
    return `${SCHEME}$N=${N},r=${r},p=${p}$${salt.toString('base64')}$${key.toString('base64')}`;
  },

  /**
   * `false` for a wrong password, a `null` hash, or a malformed one — never a throw. A
   * missing or unparseable hash still costs one full derivation at the current
   * parameters, so an unknown email takes as long as a wrong password.
   */
  async verify(plain, stored) {
    const parsed = stored === null ? null : parseHash(stored);
    if (!parsed) {
      await deriveKey(plain, DUMMY_SALT, SCRYPT_KEY_LENGTH, CURRENT_PARAMS);
      return false;
    }
    let derived: Buffer;
    try {
      derived = await deriveKey(plain, parsed.salt, parsed.key.length, parsed.params);
    } catch {
      // Parameters scrypt refuses (N not a power of two, over `maxmem`, ...).
      return false;
    }
    return timingSafeEqual(derived, parsed.key);
  },
};

/**
 * Password hashing (primitive B9): `node:crypto` scrypt behind a process-wide concurrency
 * gate. Each hash holds ~128 MiB and the rate limiter is per IP and per email, not
 * global, so the gate is what bounds memory: at most `PASSWORD_HASH_CONCURRENCY` hashes
 * run at once, later callers queue in FIFO order for up to `PASSWORD_HASH_WAIT_MS`, then
 * fail with `ServiceUnavailableError` (503).
 *
 * Routes call `withSlot` and consume the rate limit *inside* it, before hashing (B8's
 * ordering): a saturated gate then answers 503 without touching the counter.
 *
 * Stored format: `scrypt$N=<n>,r=<r>,p=<p>$<base64 salt>$<base64 key>`. `verify` reads
 * the parameters from the stored string, so raising them later still verifies old hashes.
 */
export class PasswordService {
  private readonly limit: number;
  private readonly waitMs: number;
  private active = 0;
  private readonly queue: Array<{ admit: () => void }> = [];

  constructor({ env }: { env: AppEnv }) {
    this.limit = env.PASSWORD_HASH_CONCURRENCY;
    this.waitMs = env.PASSWORD_HASH_WAIT_MS;
  }

  /** Hash `plain` in its own gate slot. */
  hash(plain: string): Promise<string> {
    return this.withSlot((slot) => slot.hash(plain));
  }

  /** Verify `plain` against `stored` in its own gate slot. */
  verify(plain: string, stored: string | null): Promise<boolean> {
    return this.withSlot((slot) => slot.verify(plain, stored));
  }

  /**
   * Hold one gate slot for the duration of `fn`, releasing it however `fn` settles.
   * Throws `ServiceUnavailableError` when no slot frees up within the wait budget.
   */
  async withSlot<T>(fn: (slot: PasswordHashingSlot) => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn(slot);
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const waiter = {
        admit: () => {
          clearTimeout(timer);
          resolve();
        },
      };
      const timer = setTimeout(() => {
        this.queue.splice(this.queue.indexOf(waiter), 1);
        reject(new ServiceUnavailableError('The server is busy. Try again in a few seconds.'));
      }, this.waitMs);
      this.queue.push(waiter);
    });
  }

  /** Hand the slot straight to the oldest waiter, or free it. */
  private release(): void {
    const next = this.queue.shift();
    if (next) next.admit();
    else this.active -= 1;
  }
}
