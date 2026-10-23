import {
  LockMode,
  UniqueConstraintViolationException,
  User,
  type EntityManager,
  type IUser,
} from '@devmentor/db';
import type { AppEnv } from '../../config/env';
import type { EventBus } from '../../events/event-bus';
import { requireRole, type Session } from '../../http/auth';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../http/errors';
import {
  guardCredentialAttempt,
  registrationLimits,
  signInLimits,
  type RateLimitKeyDeps,
  type RateLimiter,
} from '../../http/rate-limit';
import type { Logger } from '../../logger';
import type { Clock } from '../../time/clock';
import type { LoginInput } from '../../validators/auth/login.schema';
import type { RegisterInput } from '../../validators/auth/register.schema';
import type { EmailVerificationService } from './email-verification.service';
import type { GithubIdentity } from './github-identity.port';
import type { PasswordService } from './password.service';
import type { SessionClaims } from './session.service';
import {
  isOperatorEligible,
  liveRoles,
  normalizeRoles,
  reconcileOperatorRoles,
  sameRoles,
  type Role,
} from './roles';

/**
 * Plain, JSON-safe shape a user is exposed as over the API. Services own their output
 * shape (SRP) and return DTOs rather than ORM entities, so routes never risk
 * serializing a bidirectional relation cycle. Never carries `passwordHash`,
 * `emailVerifiedAt`, `sessionVersion` or `githubId`.
 */
export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  /** The stored role set, normalised: canonical order, no duplicates. */
  roles: Role[];
  githubLogin: string | null;
  avatarUrl: string | null;
  createdAt: string;
  mentorProfile: { id: string; headline: string } | null;
}

/**
 * The only fields `create` writes. Spelled out rather than spread into `em.create`, so
 * `roles`, `sessionVersion`, `githubId` and `emailVerifiedAt` can never be mass-assigned.
 */
export interface UserCreateInput {
  email: string;
  displayName: string;
}

/** What the GitHub callback needs to sign the user in: the DTO plus the cookie's version. */
export interface GithubSignIn {
  user: UserDto;
  /** Signed into the session cookie; deliberately kept out of `UserDto`. */
  sessionVersion: number;
  /** `true` only when this call created the row. */
  created: boolean;
  /**
   * The roles the new session will hold: `operator` resolved live, as `requireSession`
   * resolves it. Empty only for an operator-only row no longer on the allowlist, which
   * has no authority to sign in with; the callback refuses it.
   */
  effectiveRoles: Role[];
}

/** What the login route needs to sign the user in: the DTO plus the cookie's version. */
export interface PasswordSignIn {
  user: UserDto;
  /** Signed into the session cookie; deliberately kept out of `UserDto`. */
  sessionVersion: number;
  /** The roles the new session holds, `operator` resolved live. Never empty. */
  effectiveRoles: Role[];
}

/** What a registration reports: only the address the verification link was sent to. */
export interface PasswordRegistration {
  email: string;
}

/**
 * The one message for an unknown email *and* a wrong password (edge case 13): login never
 * says which part was wrong, so it is no account-existence oracle.
 */
export const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

export type AccountExistsReason = 'account_exists' | 'github_account';

/**
 * Registration refused because the address belongs to a verified account (edge case 14 and
 * the state matrix). `github_account` — the account signs in with GitHub only — points
 * there; this is the register path's deliberate account-existence oracle, recorded in the
 * spec. Every other verified row gets the generic `account_exists`.
 */
export class AccountExistsError extends ConflictError {
  readonly reason: AccountExistsReason;

  constructor(reason: AccountExistsReason) {
    super(
      reason === 'github_account'
        ? 'This address already has an account that signs in with GitHub. Use "Continue with GitHub" instead.'
        : 'This address already has an account. Sign in instead.',
    );
    this.reason = reason;
  }
}

export type PasswordSignInRefusedReason = 'email_unverified' | 'no_active_role';

/**
 * The right password, but no session (edge case 15): the email is not confirmed yet, or an
 * operator-only account is no longer on the allowlist. Only someone who knows the password
 * ever sees this, so it reveals nothing the generic 401 hides.
 */
export class PasswordSignInRefusedError extends ForbiddenError {
  readonly reason: PasswordSignInRefusedReason;

  constructor(reason: PasswordSignInRefusedReason) {
    super(
      reason === 'email_unverified'
        ? 'Confirm your email address first. Open the link in the email we sent you, then sign in.'
        : 'This account has no active role. Ask an operator for access.',
    );
    this.reason = reason;
  }
}

/** A grant or revoke result: what the route needs to re-issue the caller's cookie. */
export interface RoleChange {
  roles: Role[];
  sessionVersion: number;
}

/** Roles a product workflow may assign. `operator` comes only from `OPERATOR_EMAILS`. */
export type AssignableRole = Exclude<Role, 'operator'>;

export type AccountNotLinkedReason = 'email_unverified' | 'github_account_mismatch';

/**
 * A GitHub identity's email matches an existing row that may not be linked to it, so the
 * sign-in is refused and nothing is linked or created (edge case 4). `reason` lets the
 * browser-navigated callback pick its `/sign-in?error=…` message:
 * - `email_unverified` — the row's own email is not verified; verify it first.
 * - `github_account_mismatch` — the row is already linked to a different GitHub account.
 */
export class AccountNotLinkedError extends ConflictError {
  readonly reason: AccountNotLinkedReason;

  constructor(reason: AccountNotLinkedReason) {
    super(
      reason === 'email_unverified'
        ? 'An account with this email exists but its email is not verified yet'
        : 'An account with this email is already linked to a different GitHub account',
    );
    this.reason = reason;
  }
}

/** Revoking the only stored role would leave the set empty, which `users_roles_check` forbids. */
export class LastRoleError extends ConflictError {
  constructor() {
    super('A user must keep at least one role');
  }
}

/**
 * The two unique constraints a concurrent first sign-in for the same GitHub identity can
 * trip. Any other violation is a real error and propagates.
 */
const GITHUB_IDENTITY_CONSTRAINTS: ReadonlySet<unknown> = new Set([
  'users_github_id_unique',
  'users_email_unique',
]);

function isGithubIdentityRace(error: unknown): boolean {
  return (
    error instanceof UniqueConstraintViolationException &&
    GITHUB_IDENTITY_CONSTRAINTS.has((error as { constraint?: unknown }).constraint)
  );
}

/** A concurrent registration for the same new address trips only the email constraint. */
function isRegistrationRace(error: unknown): boolean {
  return (
    error instanceof UniqueConstraintViolationException &&
    (error as { constraint?: unknown }).constraint === 'users_email_unique'
  );
}

function toUserDto(user: IUser): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: normalizeRoles(user.roles),
    githubLogin: user.githubLogin ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
    mentorProfile: user.mentorProfile
      ? { id: user.mentorProfile.id, headline: user.mentorProfile.headline }
      : null,
  };
}

/** Roles changed inside a transaction; emitted only once it has committed. */
interface RolesChanged {
  userId: string;
  roles: Role[];
  previousRoles: Role[];
}

interface GithubOutcome {
  user: IUser;
  created: boolean;
  rolesChanged: RolesChanged | null;
}

interface RegistrationOutcome {
  user: IUser;
  created: boolean;
}

/** What awilix (PROXY mode) hands the constructor: the resolving scope's cradle. */
interface UserServiceDeps {
  em: EntityManager;
  logger: Logger;
  eventBus: EventBus;
  clock: Clock;
  env: Pick<AppEnv, 'OPERATOR_EMAILS' | 'TRUSTED_PROXY_HOPS'>;
  session: Promise<Session | null>;
  passwordService: Pick<PasswordService, 'withSlot'>;
  rateLimiter: Pick<RateLimiter, 'consumeAll'>;
  emailVerificationService: Pick<EmailVerificationService, 'send'>;
}

/** The collaborators only the password flows use, resolved on first use. */
type CredentialDeps = Pick<
  UserServiceDeps,
  'passwordService' | 'rateLimiter' | 'emailVerificationService'
>;

/**
 * Domain service for users. Constructor-injected by awilix (PROXY mode), so it
 * receives a request-scoped `em` (a forked EntityManager) plus the shared `logger`,
 * `eventBus`, `clock` and `env`, and the scope's lazy `session`. All persistence goes through the `em` — services never
 * touch `process.env` or the ORM singleton directly, and never build an HTTP response.
 *
 * Events are emitted only after the owning transaction commits, so a rolled-back write
 * (including the losing side of a sign-in race) never announces itself.
 */
export class UserService {
  private readonly em: EntityManager;
  private readonly logger: Logger;
  private readonly eventBus: EventBus;
  private readonly clock: Clock;
  private readonly env: Pick<AppEnv, 'OPERATOR_EMAILS' | 'TRUSTED_PROXY_HOPS'>;
  private readonly readSession: () => Promise<Session | null>;
  private readonly credentials: () => CredentialDeps;

  constructor(deps: UserServiceDeps) {
    const { em, logger, eventBus, clock, env } = deps;
    this.em = em;
    this.logger = logger;
    this.eventBus = eventBus;
    this.clock = clock;
    this.env = env;
    // Read on demand, not destructured: resolving `session` here would run the live
    // session lookup for every caller, including ones that never need it. A closure
    // rather than a stored cradle, so inspecting the service never walks the proxy.
    this.readSession = () => deps.session;
    // Also on demand: `emailVerificationService` depends on this service, so resolving it
    // at construction would be a cycle, and most callers never touch a password.
    this.credentials = () => deps;
  }

  /**
   * List users with their mentor profile eagerly populated. Operator only: this check is
   * the authority; the route's `authorize` is defence in depth. Throws `UnauthorizedError`
   * without a live session and `ForbiddenError` without the `operator` role.
   */
  async list(): Promise<UserDto[]> {
    const session = await this.readSession();
    if (!session) throw new UnauthorizedError();
    requireRole(session, 'operator');
    const users = await this.em.find(
      User,
      {},
      { populate: ['mentorProfile'], orderBy: { createdAt: 'desc' } },
    );
    return users.map(toUserDto);
  }

  /**
   * The signed-in caller's own user, for greeting them on a signed-in page. Throws
   * `UnauthorizedError` without a live session, or when its row no longer exists.
   */
  async current(): Promise<UserDto> {
    const session = await this.readSession();
    if (!session) throw new UnauthorizedError();
    const user = await this.em.findOne(
      User,
      { id: session.userId },
      { populate: ['mentorProfile'] },
    );
    if (!user) throw new UnauthorizedError();
    return toUserDto(user);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.em.findOne(User, { email });
  }

  /**
   * Create and persist a user, then emit `auth.user.created`. Only `email` and
   * `displayName` are copied; every other column keeps its database default.
   */
  async create(data: UserCreateInput): Promise<UserDto> {
    const user = this.em.create(User, { email: data.email, displayName: data.displayName });
    this.em.persist(user);
    await this.em.flush();
    this.logger.info({ userId: user.id }, 'created user');
    await this.eventBus.emit('auth.user.created', { userId: user.id, email: user.email });
    return toUserDto(user);
  }

  /**
   * Resolve a GitHub identity to exactly one user, in a transaction this concept owns:
   * match `githubId`; else link a row whose own email is verified; else create a
   * `mentee` with the email verified now. An unverified (or differently linked) matching
   * row is refused with `AccountNotLinkedError`. `users.email` is never written on an
   * existing row — it is the operator authorization key. The stored `operator` member is
   * then reconciled without touching `sessionVersion`.
   *
   * Two concurrent first sign-ins for one identity both miss and both insert; the loser
   * hits `users_github_id_unique` or `users_email_unique`, and once the winner has
   * committed the same lookup matches its row — so the transaction is re-run exactly once.
   */
  async findOrCreateFromGithub(identity: GithubIdentity): Promise<GithubSignIn> {
    let outcome: GithubOutcome;
    try {
      outcome = await this.githubSignIn(identity);
    } catch (error) {
      if (!isGithubIdentityRace(error)) throw error;
      this.logger.info({ githubId: identity.githubId }, 'github sign-in raced; re-reading');
      outcome = await this.githubSignIn(identity);
    }

    const { user, created, rolesChanged } = outcome;
    if (created) {
      this.logger.info({ userId: user.id }, 'created user from github');
      await this.eventBus.emit('auth.user.created', { userId: user.id, email: user.email });
    }
    await this.emitRolesChanged(rolesChanged);
    return {
      user: toUserDto(user),
      sessionVersion: user.sessionVersion,
      created,
      effectiveRoles: liveRoles(user.roles, isOperatorEligible(user, this.env.OPERATOR_EMAILS)),
    };
  }

  /**
   * Bring the stored `operator` member in line with `OPERATOR_EMAILS` for one user —
   * the opportunistic cache refresh any request may run when it notices a disagreement.
   * Idempotent; emits `auth.user.roles_changed` on a change; never bumps `sessionVersion`.
   * Returns the stored roles afterwards.
   */
  async reconcileOperator(userId: string): Promise<Role[]> {
    const { user, rolesChanged } = await this.em.transactional(async (em) => {
      const user = await this.lockUser(em, userId);
      return { user, rolesChanged: this.applyOperatorReconciliation(user) };
    });
    await this.emitRolesChanged(rolesChanged);
    return normalizeRoles(user.roles);
  }

  /**
   * Add `role` to the stored set, preserving every other role. A change bumps
   * `sessionVersion`, so the calling route must re-issue the caller's cookie from the
   * returned version. Granting a role already held changes nothing and bumps nothing.
   */
  async grantRole(userId: string, role: AssignableRole): Promise<RoleChange> {
    return this.changeRoles(userId, (roles) => normalizeRoles([...roles, role]));
  }

  /**
   * Remove `role` from the stored set, preserving every other role; throws `LastRoleError`
   * rather than empty the set. Bumps `sessionVersion` on a change, like `grantRole`.
   */
  async revokeRole(userId: string, role: AssignableRole): Promise<RoleChange> {
    return this.changeRoles(userId, (roles) => {
      const next = roles.filter((held) => held !== role);
      if (next.length === 0) throw new LastRoleError();
      return next;
    });
  }

  /**
   * Register an email/password account (#13), following the spec's state matrix for the
   * row already holding `input.email`:
   * - none — create a `mentee`, unverified, with the hash; emit `auth.user.created`;
   * - verified with a password, or verified with neither password nor GitHub (a seeded
   *   row) — `AccountExistsError('account_exists')`;
   * - verified, GitHub only — `AccountExistsError('github_account')`, pointing to GitHub;
   * - unverified (with or without a hash) — **claim**: write the new hash and display name.
   * Then mail a verification link bound to the new hash, so every earlier link for the row
   * stops working. No session is issued: `emailVerifiedAt` gates sign-in.
   *
   * `req` is the route's request, used only to derive B8's per-IP registration check
   * (`registrationLimits`). The service, not the route, builds the checks and runs the hash
   * inside `guardCredentialAttempt` — gate slot first, limits second, hash third — so no
   * caller can skip the limit or reorder it: a saturated gate answers 503 without counting
   * and a limited attempt never hashes. The slot covers
   * only the hash; the transaction and the mail run after it is released. A conflict still
   * costs one hash, so the 409 paths take as long as a success.
   *
   * Two registrations for one new address both miss and both insert; the loser hits
   * `users_email_unique` and re-runs its transaction once, then claims the winner's
   * still-unverified row. The mail goes out only after commit; a delivery failure rejects
   * with `ServiceUnavailableError` and leaves the unverified row and its hash in place,
   * which grants nothing and is overwritten by the next attempt.
   */
  async registerWithPassword(input: RegisterInput, req: Request): Promise<PasswordRegistration> {
    const { passwordService, rateLimiter, emailVerificationService } = this.credentials();
    const passwordHash = await guardCredentialAttempt(
      { passwordService, rateLimiter },
      registrationLimits(req, this.limitKeyDeps()),
      (slot) => slot.hash(input.password),
    );

    let outcome: RegistrationOutcome;
    try {
      outcome = await this.registration(input, passwordHash);
    } catch (error) {
      if (!isRegistrationRace(error)) throw error;
      this.logger.info('password registration raced; re-reading');
      outcome = await this.registration(input, passwordHash);
    }

    const { user, created } = outcome;
    if (created) {
      this.logger.info({ userId: user.id }, 'created user from registration');
      await this.eventBus.emit('auth.user.created', { userId: user.id, email: user.email });
    }
    await emailVerificationService.send(
      { id: user.id, email: user.email, passwordHash },
      input.returnTo,
    );
    return { email: user.email };
  }

  /**
   * Check an email and password (#13) and return what the login route needs to issue a
   * session. An unknown email and a wrong password fail identically — same class, status,
   * code and `INVALID_CREDENTIALS_MESSAGE` — and an unknown email (or a row without a
   * password) still spends one full derivation, so timing does not tell them apart either.
   * The right password on an unverified row is refused with
   * `PasswordSignInRefusedError('email_unverified')`, so claiming a row never yields a
   * session before its link is followed.
   *
   * Runs inside `guardCredentialAttempt` like `registerWithPassword`, with the per-IP and
   * per-email checks (`signInLimits`) derived here from `req` and the normalised email, and
   * the lookup after the limits so a limited attempt never reads `users`. Stored roles are preserved; only the
   * `operator` cache is reconciled, without bumping `sessionVersion`.
   */
  async authenticateWithPassword(input: LoginInput, req: Request): Promise<PasswordSignIn> {
    const { passwordService, rateLimiter } = this.credentials();
    const checks = signInLimits(req, input.email, this.limitKeyDeps());
    const user = await guardCredentialAttempt({ passwordService, rateLimiter }, checks, async (slot) => {
      const found = await this.em.findOne(
        User,
        { email: input.email },
        { populate: ['mentorProfile'] },
      );
      const valid = await slot.verify(input.password, found?.passwordHash ?? null);
      return valid ? found : null;
    });
    if (!user) throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    if (user.emailVerifiedAt == null) throw new PasswordSignInRefusedError('email_unverified');

    const stored = await this.reconcileOperator(user.id);
    const effectiveRoles = liveRoles(stored, isOperatorEligible(user, this.env.OPERATOR_EMAILS));
    if (effectiveRoles.length === 0) throw new PasswordSignInRefusedError('no_active_role');
    return { user: toUserDto(user), sessionVersion: user.sessionVersion, effectiveRoles };
  }

  /**
   * Revoke the signed-in session behind `claims` by bumping `sessionVersion` — sign-out is
   * a trigger on the closed list. Only a *live* session is revoked: an unknown user or a
   * stale version changes nothing. The comparison runs under the row lock, so two
   * concurrent sign-outs bump once. Returns whether a bump happened.
   */
  async signOut(claims: SessionClaims): Promise<boolean> {
    return this.em.transactional(async (em) => {
      const user = await em.findOne(
        User,
        { id: claims.userId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!user || user.sessionVersion !== claims.sessionVersion) return false;
      user.sessionVersion += 1;
      return true;
    });
  }

  private githubSignIn(identity: GithubIdentity): Promise<GithubOutcome> {
    return this.em.transactional(async (em) => {
      const { user, created } = await this.matchOrCreate(em, identity);
      const rolesChanged = this.applyOperatorReconciliation(user);
      await em.flush();
      return { user, created, rolesChanged };
    });
  }

  private async matchOrCreate(
    em: EntityManager,
    identity: GithubIdentity,
  ): Promise<{ user: IUser; created: boolean }> {
    const linked = await em.findOne(
      User,
      { githubId: identity.githubId },
      { populate: ['mentorProfile'] },
    );
    if (linked) {
      this.refreshGithubProfile(linked, identity);
      return { user: linked, created: false };
    }

    const byEmail = await em.findOne(
      User,
      { email: identity.email },
      { populate: ['mentorProfile'] },
    );
    if (byEmail) {
      if (byEmail.emailVerifiedAt == null) throw new AccountNotLinkedError('email_unverified');
      if (byEmail.githubId != null) throw new AccountNotLinkedError('github_account_mismatch');
      byEmail.githubId = identity.githubId;
      this.refreshGithubProfile(byEmail, identity);
      return { user: byEmail, created: false };
    }

    const user = em.create(User, {
      email: identity.email,
      displayName: identity.login,
      roles: ['mentee'],
      githubId: identity.githubId,
      githubLogin: identity.login,
      avatarUrl: identity.avatarUrl,
      emailVerifiedAt: this.clock.now(),
    });
    em.persist(user);
    return { user, created: true };
  }

  private limitKeyDeps(): RateLimitKeyDeps {
    return { env: this.env, logger: this.logger };
  }

  private registration(input: RegisterInput, passwordHash: string): Promise<RegistrationOutcome> {
    return this.em.transactional(async (em) => {
      // The lock serialises a claim with `EmailVerificationService.verify`, which compares
      // the link's fingerprint against this hash under the same lock.
      const existing = await em.findOne(
        User,
        { email: input.email },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!existing) {
        const user = em.create(User, {
          email: input.email,
          displayName: input.displayName,
          roles: ['mentee'],
          passwordHash,
          emailVerifiedAt: null,
        });
        em.persist(user);
        await em.flush();
        return { user, created: true };
      }
      if (existing.emailVerifiedAt != null) {
        throw new AccountExistsError(
          existing.passwordHash == null && existing.githubId != null
            ? 'github_account'
            : 'account_exists',
        );
      }
      existing.passwordHash = passwordHash;
      existing.displayName = input.displayName;
      return { user: existing, created: false };
    });
  }

  /** Display data only: never `email`, which is the operator authorization key. */
  private refreshGithubProfile(user: IUser, identity: GithubIdentity): void {
    user.githubLogin = identity.login;
    user.avatarUrl = identity.avatarUrl;
  }

  /** Reconcile the stored set in place; the caller's transaction flushes it. */
  private applyOperatorReconciliation(user: IUser): RolesChanged | null {
    const previousRoles = [...user.roles] as Role[];
    const roles = reconcileOperatorRoles(
      previousRoles,
      isOperatorEligible(user, this.env.OPERATOR_EMAILS),
    );
    if (sameRoles(roles, previousRoles)) return null;
    user.roles = roles;
    return { userId: user.id, roles, previousRoles };
  }

  private async changeRoles(
    userId: string,
    change: (roles: Role[]) => Role[],
  ): Promise<RoleChange> {
    const { user, rolesChanged } = await this.em.transactional(async (em) => {
      const user = await this.lockUser(em, userId);
      const previousRoles = normalizeRoles(user.roles);
      const roles = change(previousRoles);
      if (sameRoles(roles, previousRoles)) return { user, rolesChanged: null };
      user.roles = roles;
      user.sessionVersion += 1;
      return { user, rolesChanged: { userId, roles, previousRoles } };
    });
    await this.emitRolesChanged(rolesChanged);
    return { roles: normalizeRoles(user.roles), sessionVersion: user.sessionVersion };
  }

  private async lockUser(em: EntityManager, userId: string): Promise<IUser> {
    const user = await em.findOne(
      User,
      { id: userId },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  private async emitRolesChanged(change: RolesChanged | null): Promise<void> {
    if (!change) return;
    this.logger.info({ userId: change.userId, roles: change.roles }, 'user roles changed');
    await this.eventBus.emit('auth.user.roles_changed', change);
  }
}
