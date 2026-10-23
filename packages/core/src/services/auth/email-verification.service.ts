import { User, type EntityManager } from '@devmentor/db';
import type { AppEnv } from '../../config/env';
import { BadRequestError } from '../../http/errors';
import { safeReturnTo } from '../../http/return-to';
import type { Clock } from '../../time/clock';
import type { Mailer } from '../notifications/mailer.port';
import { isOperatorEligible, liveRoles, type Role } from './roles';
import type { SessionService } from './session.service';
import type { TokenService } from './token.service';
import type { UserService } from './user.service';

export const EMAIL_VERIFY_PURPOSE = 'email-verify';

/** A verification link works for 24 hours; registering again sends a fresh one. */
export const EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60;

/** The browser-navigated route that consumes the link (`?token=`). */
export const EMAIL_VERIFY_PATH = '/api/auth/verify-email';

/** Between the user id and the carried `returnTo`; user ids (UUIDs) never contain it. */
const SUBJECT_SEPARATOR = '.';

export const EMAIL_VERIFY_MAIL_SUBJECT = 'Confirm your email address for DevMentor';

/** Who the link is for: the row's id and the address the mail goes to. Nothing else. */
export interface VerificationRecipient {
  id: string;
  email: string;
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
  env: Pick<AppEnv, 'APP_URL' | 'OPERATOR_EMAILS'>;
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
    'The link works for 24 hours. If you did not create the account, ignore this email.',
    'The account stays unconfirmed and nobody can sign in to it.',
  ].join('\n');
}

/**
 * Email verification (E01 #13) on stateless purpose tokens (B5, purpose `email-verify`).
 *
 * The token's subject is `<userId>.<returnTo>` and nothing else: no password hash, no
 * email, no pending credential — the JWT is signed but not encrypted, and it travels in a
 * URL through a mail relay. The pending password is already stored on the row, and
 * `emailVerifiedAt` is what gates sign-in.
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
      subject: `${user.id}${SUBJECT_SEPARATOR}${safeReturnTo(returnTo, '')}`,
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
   * Throws `BadRequestError` for an invalid, expired or wrong-purpose token and for a
   * token naming no user.
   */
  async verify(token: string): Promise<EmailVerification> {
    const { subject } = await this.tokenService.verifyPurposeToken(token, EMAIL_VERIFY_PURPOSE);
    const separator = subject.indexOf(SUBJECT_SEPARATOR);
    if (separator <= 0) throw invalidLink();
    const userId = subject.slice(0, separator);
    const returnTo = safeReturnTo(subject.slice(separator + 1), '');

    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw invalidLink();
    if (user.emailVerifiedAt == null) {
      user.emailVerifiedAt = this.clock.now();
      await this.em.flush();
    }

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
}
