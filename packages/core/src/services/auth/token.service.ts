import { jwtVerify, SignJWT } from 'jose';
import type { AppEnv } from '../../config/env';
import { BadRequestError, ServiceUnavailableError } from '../../http/errors';
import type { Clock } from '../../time/clock';

const ALGORITHM = 'HS256';

export interface SignPurposeTokenInput {
  /** Becomes the JWT `aud`; the verifier must name the same purpose. */
  purpose: string;
  /** Becomes the JWT `sub`. */
  subject: string;
  ttlSeconds: number;
}

export interface PurposeTokenClaims {
  subject: string;
}

/**
 * Stateless purpose-bound tokens (primitive B5): HS256 JWTs signed with the
 * `SESSION_SECRET` family, the purpose carried as `aud` and enforced on verify. A
 * purpose token proves we issued the claim; it never authenticates the bearer.
 * Nothing is stored, so these tokens are neither single-use nor revocable.
 */
export class TokenService {
  private readonly env: AppEnv;
  private readonly clock: Clock;

  constructor({ env, clock }: { env: AppEnv; clock: Clock }) {
    this.env = env;
    this.clock = clock;
  }

  async signPurposeToken({ purpose, subject, ttlSeconds }: SignPurposeTokenInput): Promise<string> {
    if (!purpose) throw new Error('signPurposeToken requires a purpose');
    if (!subject) throw new Error('signPurposeToken requires a subject');
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('signPurposeToken requires a positive integer ttlSeconds');
    }
    const [key] = this.keys();
    const issuedAt = Math.floor(this.clock.now().getTime() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
      .setAudience(purpose)
      .setSubject(subject)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + ttlSeconds)
      .sign(key);
  }

  /**
   * Accepts only HS256 tokens for exactly `purpose`, unexpired at `clock.now()`, signed
   * with `SESSION_SECRET` or — during a rotation — `SESSION_SECRET_PREVIOUS`.
   * Throws `BadRequestError` for any invalid, expired, or wrong-purpose token.
   */
  async verifyPurposeToken(token: string, purpose: string): Promise<PurposeTokenClaims> {
    const keys = this.keys();
    if (!purpose) throw new BadRequestError('Invalid or expired token');
    let lastError: unknown;
    for (const key of keys) {
      try {
        const { payload } = await jwtVerify(token, key, {
          algorithms: [ALGORITHM],
          audience: purpose,
          currentDate: this.clock.now(),
          requiredClaims: ['sub', 'iat', 'exp'],
        });
        // `requiredClaims` plus jose's own claim-type checks guarantee a string `sub`.
        return { subject: payload.sub as string };
      } catch (error) {
        lastError = error;
      }
    }
    throw new BadRequestError('Invalid or expired token', { cause: lastError });
  }

  /** Current secret first (used to sign), then the previous one (verify only). */
  private keys(): [Uint8Array, ...Uint8Array[]] {
    const { SESSION_SECRET, SESSION_SECRET_PREVIOUS } = this.env;
    if (!SESSION_SECRET) {
      throw new ServiceUnavailableError('Token signing is not configured');
    }
    const encoder = new TextEncoder();
    const current = encoder.encode(SESSION_SECRET);
    return SESSION_SECRET_PREVIOUS ? [current, encoder.encode(SESSION_SECRET_PREVIOUS)] : [current];
  }
}
