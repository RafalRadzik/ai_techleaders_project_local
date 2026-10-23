import {
  LockMode,
  UniqueConstraintViolationException,
  User,
  type EntityManager,
  type IUser,
} from '@devmentor/db';
import type { AppEnv } from '../../config/env';
import type { EventBus } from '../../events/event-bus';
import { ConflictError, NotFoundError } from '../../http/errors';
import type { Logger } from '../../logger';
import type { Clock } from '../../time/clock';
import type { UserCreateInput } from '../../validators/auth/user-create.schema';
import type { GithubIdentity } from './github-identity.port';
import {
  isOperatorEligible,
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

/** What the GitHub callback needs to sign the user in: the DTO plus the cookie's version. */
export interface GithubSignIn {
  user: UserDto;
  /** Signed into the session cookie; deliberately kept out of `UserDto`. */
  sessionVersion: number;
  /** `true` only when this call created the row. */
  created: boolean;
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

/**
 * Domain service for users. Constructor-injected by awilix (PROXY mode), so it
 * receives a request-scoped `em` (a forked EntityManager) plus the shared `logger`,
 * `eventBus`, `clock` and `env`. All persistence goes through the `em` — services never
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
  private readonly env: Pick<AppEnv, 'OPERATOR_EMAILS'>;

  constructor({
    em,
    logger,
    eventBus,
    clock,
    env,
  }: {
    em: EntityManager;
    logger: Logger;
    eventBus: EventBus;
    clock: Clock;
    env: Pick<AppEnv, 'OPERATOR_EMAILS'>;
  }) {
    this.em = em;
    this.logger = logger;
    this.eventBus = eventBus;
    this.clock = clock;
    this.env = env;
  }

  /** List users with their mentor profile eagerly populated. */
  async list(): Promise<UserDto[]> {
    const users = await this.em.find(
      User,
      {},
      { populate: ['mentorProfile'], orderBy: { createdAt: 'desc' } },
    );
    return users.map(toUserDto);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.em.findOne(User, { email });
  }

  /** Create and persist a user, then emit `auth.user.created`. */
  async create(data: UserCreateInput): Promise<UserDto> {
    const user = this.em.create(User, data);
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
    return { user: toUserDto(user), sessionVersion: user.sessionVersion, created };
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
