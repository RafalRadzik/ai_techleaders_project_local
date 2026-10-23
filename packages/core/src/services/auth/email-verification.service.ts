import { createHmac } from 'node:crypto';
import { LockMode, User, type EntityManager } from '@devmentor/db';
import type { AppEnv } from '../../config/env';
import { BadRequestError } from '../../http/errors';
import { safeReturnTo } from '../../http/return-to';
import type { Clock } from '../../time/clock';
import type { Mailer } from '../notifications/mailer.port';
import { isOperatorEligible, liveRoles, type Role } from './roles';
import type { SessionService } from './session.service';
import { signingKeys } from './signing-keys';
import type { TokenService } from './token.service';
import type { UserService } from './user.service';

export const EMAIL_VERIFY_PURPOSE = 'email-verify';

/** A verification link works for 24 hours; registering again sends a fresh one. */
export const EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60;

/** The browser-navigated route that consumes the link (`?token=`). */
export const EMAIL_VERIFY_PATH = '/api/auth/verify-email';

/**
 * Between the user id, the credential fingerprint and the carried `returnTo`. Neither a
 * user id (UUID) nor a fingerprint (base64url) ever contains it.
 */
const SUBJECT_SEPARATOR = '.';

/** Bytes of HMAC-SHA256 kept in a credential fingerprint: 128 bits, 22 base64url characters. */
export const CREDENTIAL_FINGERPRINT_BYTES = 16;

/**
 * A short, one-way fingerprint of the row's current `password_hash`, bound into every
 * verification link so registering again (which overwrites the hash) invalidates every
 * earlier link for that row. `''` for a row with no password (a GitHub-only or seeded row).
 *
 * HMAC-SHA256 under a `SESSION_SECRET`-family key (`signingKeys`), truncated: the token is
 * signed but not encrypted, so anything in it is readable by whoever sees the link, and a
 * keyed fingerprint is useless to someone holding a leaked hash or link without the secret.
 * It carries no credential material — the hash, its salt and its key never leave the row.
 */
export function credentialFingerprint(
  passwordHash: string | null | undefined,
  key: Uint8Array,
): string {
  if (passwordHash == null) return '';
  return createHmac('sha256', key)
    .update(passwordHash)
    .digest()
    .subarray(0, CREDENTIAL_FINGERPRINT_BYTES)
    .toString('base64url');
}

const SIGNING_UNAVAILABLE = 'Token signing is not configured';

export const EMAIL_VERIFY_MAIL_SUBJECT = 'Confirm your email address for DevMentor';

/**
 * Who the link is for: the row's id, the address the mail goes to, and the row's current
 * `passwordHash` — read only to derive the link's fingerprint, never put in the token.
 */
export interface VerificationRecipient {
  id: string;
  email: string;
  passwordHash: string | null;
}

/** What the verification route needs to sign the user in and redirect them. */
export interface EmailVerification {
  /**
   * The roles the new session holds, `operator` resolved live. Empty only for an
   * operator-only row no longer on the allowlist; then `cookie` is `null` and the route
   * refuses the sign-in, as the GitHub callback does.
   */
  roles: Role[];
  /** `Set-Cookie` value of the new session, or `null` when `roles` is empty. */
  cookie: string | null;
  /** The sanitised destination the link carried, or `''` for the role home. */
  returnTo: string;
}

interface EmailVerificationDeps {
  em: EntityManager;
  tokenService: Pick<TokenService, 'signPurposeToken' | 'verifyPurposeToken'>;
  sessionService: Pick<SessionService, 'issue'>;
  userService: Pick<UserService, 'reconcileOperator'>;
  mailer: Mailer;
  clock: Clock;
  env: Pick<AppEnv, 'APP_URL' | 'OPERATOR_EMAILS' | 'SESSION_SECRET' | 'SESSION_SECRET_PREVIOUS'>;
}

function invalidLink(): BadRequestError {
  return new BadRequestError('Invalid or expired token');
}

function mailText(link: string): string {
  return [
    'A DevMentor account was just created with this email address.',
    '',
    'Open this link to confirm the address and sign in:',
    link,
    '',
    'The link works for 24 hours. Registering again sends a new link and the old one stops working.',
    '',
    'If you did not sign up for DevMentor, do not open the link. Ignore this email:',
    'the account stays unconfirmed and nobody can sign in to it.',
  ].join('\n');
}

/**
 * Email verification (E01 #13) on stateless purpose tokens (B5, purpose `email-verify`).
 *
 * The token's subject is `<userId>.<fingerprint>.<returnTo>` and nothing else: no password
 * hash, no email, no pending credential — the JWT is signed but not encrypted, and it
 * travels in a URL through a mail relay. The pending password is already stored on the row,
 * and `emailVerifiedAt` is what gates sign-in. The fingerprint (`credentialFingerprint`)
 * binds the link to the hash the row held when it was sent: a later registration for the
 * same unverified address overwrites the hash, so only the newest link verifies. That
 * narrows, but does not close, the pre-account-hijack risk (see `.ai/lessons.md`).
 *
 * A verification link is bearer-authenticated by construction (B5): whoever holds it within
 * its 24 hours is treated as the inbox owner. Verifying an already-verified row is
 * idempotent and still signs the holder in, so a mail scanner that prefetched the link does
 * not break the user's own click (edge case 16).
 */
export class EmailVerificationService {
  private readonly em: EntityManager;
  private readonly tokenService: EmailVerificationDeps['tokenService'];
  private readonly sessionService: EmailVerificationDeps['sessionService'];
  private readonly userService: EmailVerificationDeps['userService'];
  private readonly mailer: Mailer;
  private readonly clock: Clock;
  private readonly env: EmailVerificationDeps['env'];

  constructor({ em, tokenService, sessionService, userService, mailer, clock, env }: EmailVerificationDeps) {
    this.em = em;
    this.tokenService = tokenService;
    this.sessionService = sessionService;
    this.userService = userService;
    this.mailer = mailer;
    this.clock = clock;
    this.env = env;
  }

  /**
   * Mail `user` a 24-hour verification link carrying the sanitised `returnTo`. Rejects
   * with `ServiceUnavailableError` when the mail is not accepted for delivery (or signing
   * is not configured), so the caller never reports success without a sent link.
   */
  async send(user: VerificationRecipient, returnTo?: string | null): Promise<void> {
    const token = await this.tokenService.signPurposeToken({
      purpose: EMAIL_VERIFY_PURPOSE,
      subject: [
        user.id,
        credentialFingerprint(user.passwordHash, signingKeys(this.env, SIGNING_UNAVAILABLE)[0]),
        safeReturnTo(returnTo, ''),
      ].join(SUBJECT_SEPARATOR),
      ttlSeconds: EMAIL_VERIFY_TTL_SECONDS,
    });
    const link = new URL(EMAIL_VERIFY_PATH, this.env.APP_URL);
    link.searchParams.set('token', token);
    await this.mailer.send({
      to: user.email,
      subject: EMAIL_VERIFY_MAIL_SUBJECT,
      text: mailText(link.toString()),
    });
  }

  /**
   * Consume a verification link: set `emailVerifiedAt` if unset (already verified is a
   * success, not an error), reconcile the stored `operator` member, and issue a session.
   * Throws `BadRequestError` for an invalid, expired or wrong-purpose token, for a token
   * naming no user, and for a link superseded by a later registration (its fingerprint no
   * longer matches the row's `passwordHash`).
   *
   * The fingerprint is compared under the row lock that registration also takes, so a
   * re-registration cannot overwrite the hash between the comparison and the write.
   */
  async verify(token: string): Promise<EmailVerification> {
    const { subject } = await this.tokenService.verifyPurposeToken(token, EMAIL_VERIFY_PURPOSE);
    const first = subject.indexOf(SUBJECT_SEPARATOR);
    const second = subject.indexOf(SUBJECT_SEPARATOR, first + 1);
    if (first <= 0 || second < 0) throw invalidLink();
    const userId = subject.slice(0, first);
    const fingerprint = subject.slice(first + 1, second);
    const returnTo = safeReturnTo(subject.slice(second + 1), '');

    const user = await this.em.transactional(async (em) => {
      const user = await em.findOne(
        User,
        { id: userId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!user || !this.fingerprintMatches(user.passwordHash, fingerprint)) throw invalidLink();
      if (user.emailVerifiedAt == null) user.emailVerifiedAt = this.clock.now();
      return user;
    });

    // Verification can make an allowlisted address operator-eligible; refresh the cache.
    const stored = await this.userService.reconcileOperator(user.id);
    const roles = liveRoles(stored, isOperatorEligible(user, this.env.OPERATOR_EMAILS));
    if (roles.length === 0) return { roles, cookie: null, returnTo };

    const { cookie } = await this.sessionService.issue({
      id: user.id,
      sessionVersion: user.sessionVersion,
    });
    return { roles, cookie, returnTo };
  }

  /** Any `SESSION_SECRET`-family key, so a link sent before a secret rotation still works. */
  private fingerprintMatches(passwordHash: string | null | undefined, fingerprint: string): boolean {
    return signingKeys(this.env, SIGNING_UNAVAILABLE).some(
      (key) => credentialFingerprint(passwordHash, key) === fingerprint,
    );
  }
}
