import { jwtVerify, SignJWT } from 'jose';
import type { AppEnv } from '../../config/env';
import type { Clock } from '../../time/clock';
import { JWT_ALGORITHM, signingKeys } from './signing-keys';

/** Cookie name — a §7 backward-compatibility surface; never rename it. */
export const SESSION_COOKIE_NAME = 'devmentor_session';

/** The audience every session token carries and the only one `verify` accepts. */
export const SESSION_AUDIENCE = 'session';

/** Session lifetime: 24 hours, no refresh flow. */
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

/**
 * What a verified session cookie proves: who signed in, at which `session_version`.
 * Deliberately no roles — authorization always loads the stored set (B3).
 */
export interface SessionClaims {
  userId: string;
  sessionVersion: number;
}

export interface IssuedSession {
  /** The complete `Set-Cookie` header value. */
  cookie: string;
  expiresAt: Date;
}

const EXPIRED = new Date(0);

function isSessionVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Raw value of the `devmentor_session` cookie in a `Cookie` request header, or `null`
 * when absent or empty. The value is untrusted until `SessionService.verify` accepts it,
 * and even then only the live check in `requireSession` authorizes anything.
 */
export function readSessionCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() !== SESSION_COOKIE_NAME) continue;
    const value = pair.slice(separator + 1).trim();
    return value || null;
  }
  return null;
}

/**
 * Stateless session tokens (primitive B2): HS256 JWTs `{ sub, sv, aud: 'session', iat,
 * exp }` signed with `SESSION_SECRET`, carried in the `devmentor_session` cookie.
 * `verify` is pure and DB-free; revocation (`sv` against `users.session_version`) is
 * the caller's live check.
 */
export class SessionService {
  private readonly env: AppEnv;
  private readonly clock: Clock;

  constructor({ env, clock }: { env: AppEnv; clock: Clock }) {
    this.env = env;
    this.clock = clock;
  }

  /** Signs a 24 h session for `user` and returns its `Set-Cookie` value. Never uses the previous secret. */
  async issue(user: { id: string; sessionVersion: number }): Promise<IssuedSession> {
    const [key] = this.keys();
    if (!user.id) throw new Error('issue requires a user id');
    if (!isSessionVersion(user.sessionVersion)) {
      throw new Error('issue requires a non-negative integer sessionVersion');
    }
    const issuedAt = Math.floor(this.clock.now().getTime() / 1000);
    const expiresAtSeconds = issuedAt + SESSION_TTL_SECONDS;
    const token = await new SignJWT({ sv: user.sessionVersion })
      .setProtectedHeader({ alg: JWT_ALGORITHM, typ: 'JWT' })
      .setAudience(SESSION_AUDIENCE)
      .setSubject(user.id)
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAtSeconds)
      .sign(key);
    const expiresAt = new Date(expiresAtSeconds * 1000);
    return {
      cookie: this.serialize(token, SESSION_TTL_SECONDS, expiresAt),
      expiresAt,
    };
  }

  /**
   * Claims of a valid session cookie value, or `null` for anything else: malformed,
   * tampered, expired at `clock.now()`, not HS256, wrong audience, or unknown key.
   * Accepts `SESSION_SECRET_PREVIOUS` during a rotation. Throws
   * `ServiceUnavailableError` only when `SESSION_SECRET` is unset.
   */
  async verify(cookieValue: string): Promise<SessionClaims | null> {
    const keys = this.keys();
    if (!cookieValue) return null;
    for (const key of keys) {
      try {
        const { payload } = await jwtVerify(cookieValue, key, {
          algorithms: [JWT_ALGORITHM],
          audience: SESSION_AUDIENCE,
          currentDate: this.clock.now(),
          requiredClaims: ['sub', 'sv', 'iat', 'exp'],
        });
        if (!payload.sub || !isSessionVersion(payload.sv)) return null;
        return { userId: payload.sub, sessionVersion: payload.sv };
      } catch {
        // Try the next key; a value no key accepts is simply not a session.
      }
    }
    return null;
  }

  /** The `Set-Cookie` value that removes the session cookie from the browser. */
  clear(): string {
    return this.serialize('', 0, EXPIRED);
  }

  /** Hand-rolled `Set-Cookie` serialisation; the JWT is base64url, so no encoding is needed. */
  private serialize(value: string, maxAgeSeconds: number, expires: Date): string {
    const attributes = [
      `${SESSION_COOKIE_NAME}=${value}`,
      'Path=/',
      `Max-Age=${maxAgeSeconds}`,
      `Expires=${expires.toUTCString()}`,
      'HttpOnly',
      'SameSite=Lax',
    ];
    if (this.env.NODE_ENV === 'production') attributes.push('Secure');
    return attributes.join('; ');
  }

  private keys(): [Uint8Array, ...Uint8Array[]] {
    return signingKeys(this.env, 'Sessions are not configured');
  }
}
