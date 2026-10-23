import {
  LockMode,
  UniqueConstraintViolationException,
  User,
  type EntityManager,
} from '@devmentor/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppEnv } from '../../config/env';
import type { EventBus } from '../../events/event-bus';
import type { Session } from '../../http/auth';
import {
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../http/errors';
import {
  REGISTRATION_PER_IP,
  SIGN_IN_PER_EMAIL,
  SIGN_IN_PER_IP,
  rateLimitKey,
  type RateLimitCheck,
  type RateLimiter,
} from '../../http/rate-limit';
import type { Logger } from '../../logger';
import { EmailVerificationService } from './email-verification.service';
import type { GithubIdentity } from './github-identity.port';
import type { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import {
  AccountExistsError,
  AccountNotLinkedError,
  INVALID_CREDENTIALS_MESSAGE,
  LastRoleError,
  PasswordSignInRefusedError,
  UserService,
} from './user.service';

const NOW = new Date('2026-10-23T10:00:00.000Z');
const EARLIER = new Date('2026-09-01T08:00:00.000Z');
const FOUNDER = 'founder@devmentor.dev';

interface Row {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  githubId?: string | null;
  githubLogin?: string | null;
  avatarUrl?: string | null;
  emailVerifiedAt?: Date | null;
  sessionVersion: number;
  createdAt: Date;
  mentorProfile?: { id: string; headline: string } | null;
  passwordHash?: string | null;
}

function row(overrides: Partial<Row> & Pick<Row, 'id' | 'email'>): Row {
  return {
    displayName: overrides.id,
    roles: ['mentee'],
    githubId: null,
    githubLogin: null,
    avatarUrl: null,
    emailVerifiedAt: EARLIER,
    sessionVersion: 3,
    createdAt: EARLIER,
    mentorProfile: null,
    ...overrides,
  };
}

/**
 * A minimal in-memory stand-in for the request-scoped `EntityManager`: `findOne` matches
 * on the given keys, `transactional` runs the callback against the same manager and then
 * flushes, and `flush` moves persisted rows into the table unless `failNextFlush` throws.
 */
function fakeEm(initial: Row[] = []) {
  const rows = [...initial];
  let pending: Row[] = [];
  let created = 0;
  const failures: Array<() => unknown> = [];

  const em = {
    rows,
    failNextFlush(fail: () => unknown) {
      failures.push(fail);
    },
    find: vi.fn(async () => [...rows]),
    findOne: vi.fn(async (_entity: unknown, where: Record<string, unknown>) => {
      return (
        rows.find((candidate) =>
          Object.entries(where).every(
            ([key, value]) => candidate[key as keyof Row] === value,
          ),
        ) ?? null
      );
    }),
    create: vi.fn((_entity: unknown, data: Partial<Row>) => {
      created += 1;
      return { id: `new-${created}`, createdAt: NOW, sessionVersion: 0, ...data } as Row;
    }),
    persist: vi.fn((entity: Row) => {
      pending.push(entity);
    }),
    flush: vi.fn(async () => {
      const fail = failures.shift();
      if (fail) {
        pending = [];
        throw fail();
      }
      rows.push(...pending);
      pending = [];
    }),
    transactional: vi.fn(async <T>(work: (inner: unknown) => Promise<T>): Promise<T> => {
      const result = await work(em);
      await em.flush();
      return result;
    }),
  };
  return em;
}

type FakeEm = ReturnType<typeof fakeEm>;

const OPERATOR: Session = { userId: 'op', roles: ['operator'] };

function makeService(
  em: FakeEm,
  operatorEmails: string[] = [],
  session: Session | null = OPERATOR,
  verification?: Pick<EmailVerificationService, 'send'>,
) {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const eventBus = { emit: vi.fn(async () => undefined) };
  const sessionRead = vi.fn(() => Promise.resolve(session));
  // Records B8's ordering: gate slot, then limits, then the credential work.
  const steps: string[] = [];
  const slot = {
    hash: vi.fn(async (plain: string) => {
      steps.push('hash');
      return `hash:${plain}`;
    }),
    // A `null` (unknown email, no password) still costs a derivation in the real slot.
    verify: vi.fn(async (plain: string, stored: string | null) => {
      steps.push('verify');
      return stored === `hash:${plain}`;
    }),
  };
  const passwordService = {
    withSlot: vi.fn(async <T>(fn: (held: typeof slot) => Promise<T>): Promise<T> => {
      steps.push('slot');
      return fn(slot);
    }),
  };
  const rateLimiter = {
    consumeAll: vi.fn(async () => {
      steps.push('consume');
    }),
  };
  const emailVerificationService = {
    send: vi.fn<(recipient: unknown, returnTo?: string | null) => Promise<void>>(async () => {
      steps.push('mail');
    }),
  };
  const credentialsRead = vi.fn();
  const deps = {
    em: em as unknown as EntityManager,
    logger: logger as unknown as Logger,
    eventBus: eventBus as unknown as EventBus,
    clock: { now: () => NOW },
    env: { OPERATOR_EMAILS: operatorEmails, TRUSTED_PROXY_HOPS: 1 },
    // A getter, like awilix's PROXY cradle: reading it is what resolves the session.
    get session() {
      return sessionRead();
    },
    get passwordService() {
      credentialsRead('passwordService');
      return passwordService as unknown as PasswordService;
    },
    get rateLimiter() {
      credentialsRead('rateLimiter');
      return rateLimiter as unknown as RateLimiter;
    },
    get emailVerificationService() {
      credentialsRead('emailVerificationService');
      return (verification ?? emailVerificationService) as unknown as EmailVerificationService;
    },
  };
  const service = new UserService(deps);
  return {
    service,
    logger,
    eventBus,
    sessionRead,
    steps,
    slot,
    passwordService,
    rateLimiter,
    emailVerificationService,
    credentialsRead,
  };
}

const identity = (overrides: Partial<GithubIdentity> = {}): GithubIdentity => ({
  githubId: '1001',
  login: 'octo',
  email: 'octo@example.com',
  avatarUrl: 'https://avatars.example/octo.png',
  ...overrides,
});

const uniqueViolation = (constraint: string) =>
  new UniqueConstraintViolationException(
    Object.assign(new Error('duplicate key value violates unique constraint'), { constraint }),
  );

function eventNames(eventBus: { emit: ReturnType<typeof vi.fn> }): string[] {
  return eventBus.emit.mock.calls.map(([name]) => name as string);
}

let em: FakeEm;

beforeEach(() => {
  em = fakeEm();
});

describe('UserService.list / findByEmail / create', () => {
  it('lists DTOs with roles and GitHub display data, never internal fields', async () => {
    em = fakeEm([
      row({
        id: 'u1',
        email: 'ada@example.com',
        roles: ['mentor', 'mentee', 'mentee'],
        githubId: '42',
        githubLogin: 'ada',
        avatarUrl: 'https://avatars.example/ada.png',
        mentorProfile: { id: 'mp1', headline: 'Compilers' },
      }),
    ]);
    const { service } = makeService(em);

    const [dto] = await service.list();

    expect(em.find).toHaveBeenCalledWith(
      User,
      {},
      { populate: ['mentorProfile'], orderBy: { createdAt: 'desc' } },
    );
    expect(dto).toEqual({
      id: 'u1',
      email: 'ada@example.com',
      displayName: 'u1',
      roles: ['mentee', 'mentor'],
      githubLogin: 'ada',
      avatarUrl: 'https://avatars.example/ada.png',
      createdAt: EARLIER.toISOString(),
      mentorProfile: { id: 'mp1', headline: 'Compilers' },
    });
    for (const hidden of ['githubId', 'sessionVersion', 'emailVerifiedAt', 'passwordHash']) {
      expect(dto).not.toHaveProperty(hidden);
    }
  });

  it('finds a user by email', async () => {
    const ada = row({ id: 'u1', email: 'ada@example.com' });
    em = fakeEm([ada]);
    const { service } = makeService(em);
    await expect(service.findByEmail('ada@example.com')).resolves.toBe(ada);
    await expect(service.findByEmail('nobody@example.com')).resolves.toBeNull();
  });

  it('does not resolve the session until list needs it', async () => {
    const { service, sessionRead } = makeService(em);
    await service.findByEmail('ada@example.com');
    expect(sessionRead).not.toHaveBeenCalled();
    await service.list();
    expect(sessionRead).toHaveBeenCalledOnce();
  });

  it('refuses to list for an anonymous caller', async () => {
    const { service } = makeService(em, [], null);
    await expect(service.list()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(em.find).not.toHaveBeenCalled();
  });

  it.each<[string, Session['roles']]>([
    ['mentee', ['mentee']],
    ['mentor', ['mentee', 'mentor']],
  ])('refuses to list for a %s caller', async (_name, roles) => {
    const { service } = makeService(em, [], { userId: 'u1', roles });
    await expect(service.list()).rejects.toBeInstanceOf(ForbiddenError);
    expect(em.find).not.toHaveBeenCalled();
  });

  it('lists for a caller holding operator among other roles', async () => {
    const { service } = makeService(em, [], { userId: 'u1', roles: ['mentor', 'operator'] });
    await expect(service.list()).resolves.toEqual([]);
  });

  it("returns the signed-in caller's own DTO", async () => {
    em = fakeEm([
      row({ id: 'other', email: 'other@example.com' }),
      row({ id: 'u1', email: 'ada@example.com', displayName: 'Ada', roles: ['mentor'] }),
    ]);
    const { service } = makeService(em, [], { userId: 'u1', roles: ['mentor'] });

    await expect(service.current()).resolves.toMatchObject({
      id: 'u1',
      displayName: 'Ada',
      roles: ['mentor'],
    });
    expect(em.findOne).toHaveBeenCalledWith(
      User,
      { id: 'u1' },
      { populate: ['mentorProfile'] },
    );
  });

  it('refuses current() without a live session, reading nothing', async () => {
    const { service } = makeService(em, [], null);
    await expect(service.current()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it("refuses current() when the session's row is gone", async () => {
    const { service } = makeService(em, [], { userId: 'gone', roles: ['mentee'] });
    await expect(service.current()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('copies only email and displayName, so create cannot set roles', async () => {
    const { service } = makeService(em);
    const input = {
      email: 'new@example.com',
      displayName: 'New',
      roles: ['operator'],
      sessionVersion: 9,
      githubId: '1',
      emailVerifiedAt: NOW,
    };

    // @ts-expect-error -- `roles` is not part of `UserCreateInput`.
    await service.create({ email: 'x@example.com', displayName: 'X', roles: ['operator'] });
    await service.create(input);

    expect(em.create).toHaveBeenNthCalledWith(2, User, {
      email: 'new@example.com',
      displayName: 'New',
    });
    for (const unset of ['roles', 'githubId', 'emailVerifiedAt']) {
      expect(em.rows[1]).not.toHaveProperty(unset);
    }
    expect(em.rows[1]?.sessionVersion).toBe(0);
  });

  it('creates a user and emits auth.user.created', async () => {
    const { service, eventBus } = makeService(em);

    const dto = await service.create({ email: 'new@example.com', displayName: 'New' });

    expect(dto).toMatchObject({
      id: 'new-1',
      email: 'new@example.com',
      roles: [],
      githubLogin: null,
      avatarUrl: null,
      mentorProfile: null,
    });
    expect(em.rows).toHaveLength(1);
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.created', {
      userId: 'new-1',
      email: 'new@example.com',
    });
  });
});

describe('UserService.findOrCreateFromGithub — matching', () => {
  it('matches by githubId, refreshes display data and never rewrites email', async () => {
    const linked = row({ id: 'u1', email: FOUNDER, githubId: '1001', githubLogin: 'old' });
    em = fakeEm([linked]);
    const { service, eventBus } = makeService(em);

    const result = await service.findOrCreateFromGithub(
      identity({ email: 'new-primary@example.com', login: 'octo-renamed' }),
    );

    expect(result).toEqual({
      user: expect.objectContaining({ id: 'u1', email: FOUNDER, githubLogin: 'octo-renamed' }),
      sessionVersion: 3,
      created: false,
      effectiveRoles: ['mentee'],
    });
    expect(linked.email).toBe(FOUNDER);
    expect(linked.avatarUrl).toBe('https://avatars.example/octo.png');
    expect(em.findOne).toHaveBeenCalledTimes(1);
    expect(em.findOne).toHaveBeenCalledWith(
      User,
      { githubId: '1001' },
      { populate: ['mentorProfile'] },
    );
    expect(em.create).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('links a row whose own email is verified, without creating a second account', async () => {
    const ada = row({ id: 'u1', email: 'octo@example.com', roles: ['mentor'] });
    em = fakeEm([ada]);
    const { service, eventBus } = makeService(em);

    const result = await service.findOrCreateFromGithub(identity());

    expect(result.user).toMatchObject({ id: 'u1', roles: ['mentor'], githubLogin: 'octo' });
    expect(result.created).toBe(false);
    expect(ada.githubId).toBe('1001');
    expect(em.rows).toHaveLength(1);
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('refuses an unverified matching row and links nothing', async () => {
    const pending = row({ id: 'u1', email: 'octo@example.com', emailVerifiedAt: null });
    em = fakeEm([pending]);
    const { service, eventBus } = makeService(em);

    const failure = service.findOrCreateFromGithub(identity());

    await expect(failure).rejects.toBeInstanceOf(AccountNotLinkedError);
    await expect(failure).rejects.toMatchObject({ reason: 'email_unverified', status: 409 });
    expect(pending.githubId).toBeNull();
    expect(pending.githubLogin).toBeNull();
    expect(em.create).not.toHaveBeenCalled();
    expect(em.rows).toHaveLength(1);
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('refuses a verified row already linked to a different GitHub account', async () => {
    const other = row({ id: 'u1', email: 'octo@example.com', githubId: '9999' });
    em = fakeEm([other]);
    const { service } = makeService(em);

    await expect(service.findOrCreateFromGithub(identity())).rejects.toMatchObject({
      name: 'AccountNotLinkedError',
      reason: 'github_account_mismatch',
      message: expect.stringContaining('different GitHub account'),
    });
    expect(other.githubId).toBe('9999');
  });

  it('creates a verified mentee and emits auth.user.created', async () => {
    const { service, eventBus } = makeService(em);

    const result = await service.findOrCreateFromGithub(identity());

    expect(em.create).toHaveBeenCalledWith(User, {
      email: 'octo@example.com',
      displayName: 'octo',
      roles: ['mentee'],
      githubId: '1001',
      githubLogin: 'octo',
      avatarUrl: 'https://avatars.example/octo.png',
      emailVerifiedAt: NOW,
    });
    expect(em.rows).toHaveLength(1);
    expect(result).toEqual({
      user: expect.objectContaining({ id: 'new-1', roles: ['mentee'], mentorProfile: null }),
      sessionVersion: 0,
      created: true,
      effectiveRoles: ['mentee'],
    });
    expect(eventNames(eventBus)).toEqual(['auth.user.created']);
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.created', {
      userId: 'new-1',
      email: 'octo@example.com',
    });
  });

  it('creates an allowlisted user as mentee + operator and announces both', async () => {
    const { service, eventBus } = makeService(em, ['octo@example.com']);

    const result = await service.findOrCreateFromGithub(identity());

    expect(result.user.roles).toEqual(['mentee', 'operator']);
    expect(eventNames(eventBus)).toEqual(['auth.user.created', 'auth.user.roles_changed']);
  });
});

describe('UserService.findOrCreateFromGithub — operator reconciliation', () => {
  it('promotes an allowlisted verified row without bumping sessionVersion', async () => {
    const founder = row({ id: 'u1', email: FOUNDER, githubId: '1001' });
    em = fakeEm([founder]);
    const { service, eventBus } = makeService(em, [FOUNDER]);

    const result = await service.findOrCreateFromGithub(identity());

    expect(result.user.roles).toEqual(['mentee', 'operator']);
    expect(result.sessionVersion).toBe(3);
    expect(founder.sessionVersion).toBe(3);
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: 'u1',
      roles: ['mentee', 'operator'],
      previousRoles: ['mentee'],
    });
  });

  it('demotes a row removed from the allowlist and keeps mentor', async () => {
    const founder = row({
      id: 'u1',
      email: FOUNDER,
      githubId: '1001',
      roles: ['mentor', 'operator'],
    });
    em = fakeEm([founder]);
    const { service, eventBus } = makeService(em, []);

    const result = await service.findOrCreateFromGithub(identity());

    expect(result.user.roles).toEqual(['mentor']);
    expect(founder.sessionVersion).toBe(3);
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: 'u1',
      roles: ['mentor'],
      previousRoles: ['mentor', 'operator'],
    });
  });

  it('keeps mentor through promotion', async () => {
    em = fakeEm([row({ id: 'u1', email: FOUNDER, githubId: '1001', roles: ['mentor'] })]);
    const { service } = makeService(em, [FOUNDER]);

    const result = await service.findOrCreateFromGithub(identity());

    expect(result.user.roles).toEqual(['mentor', 'operator']);
  });

  it('matches the allowlist trimmed and case-insensitively', async () => {
    em = fakeEm([row({ id: 'u1', email: 'Founder@DevMentor.dev', githubId: '1001' })]);
    const { service } = makeService(em, ['  FOUNDER@devmentor.DEV ']);

    const result = await service.findOrCreateFromGithub(identity());

    expect(result.user.roles).toEqual(['mentee', 'operator']);
  });

  it('normalises stored roles to canonical order without duplicates', async () => {
    const founder = row({
      id: 'u1',
      email: FOUNDER,
      githubId: '1001',
      roles: ['operator', 'mentor', 'mentee', 'mentor'],
    });
    em = fakeEm([founder]);
    const { service, eventBus } = makeService(em, [FOUNDER]);

    const result = await service.findOrCreateFromGithub(identity());

    expect(founder.roles).toEqual(['mentee', 'mentor', 'operator']);
    expect(result.user.roles).toEqual(['mentee', 'mentor', 'operator']);
    expect(eventNames(eventBus)).toEqual(['auth.user.roles_changed']);
  });

  it('emits nothing when the stored set already agrees', async () => {
    em = fakeEm([
      row({ id: 'u1', email: FOUNDER, githubId: '1001', roles: ['mentee', 'operator'] }),
    ]);
    const { service, eventBus } = makeService(em, [FOUNDER]);

    await service.findOrCreateFromGithub(identity());

    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});

describe('UserService.findOrCreateFromGithub — concurrent first sign-in', () => {
  it.each(['users_github_id_unique', 'users_email_unique'])(
    'recovers from %s by re-reading the winning row',
    async (constraint) => {
      const { service, eventBus, logger } = makeService(em);
      em.failNextFlush(() => {
        // The other request committed its insert first.
        em.rows.push(row({ id: 'winner', email: 'octo@example.com', githubId: '1001' }));
        return uniqueViolation(constraint);
      });

      const result = await service.findOrCreateFromGithub(identity());

      expect(result).toMatchObject({ user: { id: 'winner' }, created: false });
      expect(em.rows.map((candidate) => candidate.id)).toEqual(['winner']);
      expect(em.transactional).toHaveBeenCalledTimes(2);
      expect(eventBus.emit).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        { githubId: '1001' },
        'github sign-in raced; re-reading',
      );
    },
  );

  it('rethrows a unique violation on any other constraint', async () => {
    const { service } = makeService(em);
    const violation = uniqueViolation('users_pkey');
    em.failNextFlush(() => violation);

    await expect(service.findOrCreateFromGithub(identity())).rejects.toBe(violation);
    expect(em.transactional).toHaveBeenCalledTimes(1);
  });

  it('rethrows errors that are not unique violations', async () => {
    const { service } = makeService(em);
    const failure = Object.assign(new Error('boom'), { constraint: 'users_github_id_unique' });
    em.failNextFlush(() => failure);

    await expect(service.findOrCreateFromGithub(identity())).rejects.toBe(failure);
    expect(em.transactional).toHaveBeenCalledTimes(1);
  });

  it('retries only once', async () => {
    const { service } = makeService(em);
    const second = uniqueViolation('users_email_unique');
    em.failNextFlush(() => uniqueViolation('users_github_id_unique'));
    em.failNextFlush(() => second);

    await expect(service.findOrCreateFromGithub(identity())).rejects.toBe(second);
    expect(em.transactional).toHaveBeenCalledTimes(2);
  });
});

describe('UserService.reconcileOperator', () => {
  it('locks the row, demotes it and leaves sessionVersion untouched', async () => {
    const founder = row({ id: 'u1', email: FOUNDER, roles: ['mentee', 'operator'] });
    em = fakeEm([founder]);
    const { service, eventBus } = makeService(em, []);

    await expect(service.reconcileOperator('u1')).resolves.toEqual(['mentee']);

    expect(em.findOne).toHaveBeenCalledWith(
      User,
      { id: 'u1' },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    expect(founder.sessionVersion).toBe(3);
    expect(eventNames(eventBus)).toEqual(['auth.user.roles_changed']);
  });

  it('never promotes an unverified allowlisted email', async () => {
    const pending = row({ id: 'u1', email: FOUNDER, emailVerifiedAt: null });
    em = fakeEm([pending]);
    const { service, eventBus } = makeService(em, [FOUNDER]);

    await expect(service.reconcileOperator('u1')).resolves.toEqual(['mentee']);
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('keeps a stale operator member rather than empty the stored set', async () => {
    const founder = row({ id: 'u1', email: FOUNDER, roles: ['operator'] });
    em = fakeEm([founder]);
    const { service, eventBus } = makeService(em, []);

    await expect(service.reconcileOperator('u1')).resolves.toEqual(['operator']);
    expect(founder.roles).toEqual(['operator']);
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('throws NotFoundError for an unknown user', async () => {
    const { service } = makeService(em);
    await expect(service.reconcileOperator('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UserService.grantRole / revokeRole', () => {
  it('grantRole adds the role, preserves the others and bumps sessionVersion', async () => {
    const ada = row({ id: 'u1', email: FOUNDER, roles: ['operator', 'mentee'] });
    em = fakeEm([ada]);
    const { service, eventBus } = makeService(em, [FOUNDER]);

    const change = await service.grantRole('u1', 'mentor');

    expect(change).toEqual({ roles: ['mentee', 'mentor', 'operator'], sessionVersion: 4 });
    expect(ada.roles).toEqual(['mentee', 'mentor', 'operator']);
    expect(ada.sessionVersion).toBe(4);
    expect(em.findOne).toHaveBeenCalledWith(
      User,
      { id: 'u1' },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: 'u1',
      roles: ['mentee', 'mentor', 'operator'],
      previousRoles: ['mentee', 'operator'],
    });
  });

  it('grantRole of a role already held changes and bumps nothing', async () => {
    const ada = row({ id: 'u1', email: 'ada@example.com', roles: ['mentor', 'mentor'] });
    em = fakeEm([ada]);
    const { service, eventBus } = makeService(em);

    await expect(service.grantRole('u1', 'mentor')).resolves.toEqual({
      roles: ['mentor'],
      sessionVersion: 3,
    });
    expect(ada.sessionVersion).toBe(3);
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('revokeRole removes the role, preserves the others and bumps sessionVersion', async () => {
    const ada = row({ id: 'u1', email: 'ada@example.com', roles: ['mentee', 'mentor'] });
    em = fakeEm([ada]);
    const { service, eventBus } = makeService(em);

    await expect(service.revokeRole('u1', 'mentee')).resolves.toEqual({
      roles: ['mentor'],
      sessionVersion: 4,
    });
    expect(eventNames(eventBus)).toEqual(['auth.user.roles_changed']);
  });

  it('revokeRole of a role not held changes and bumps nothing', async () => {
    em = fakeEm([row({ id: 'u1', email: 'ada@example.com', roles: ['mentee'] })]);
    const { service, eventBus } = makeService(em);

    await expect(service.revokeRole('u1', 'mentor')).resolves.toEqual({
      roles: ['mentee'],
      sessionVersion: 3,
    });
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('revokeRole refuses to empty the stored set', async () => {
    const ada = row({ id: 'u1', email: 'ada@example.com', roles: ['mentee'] });
    em = fakeEm([ada]);
    const { service } = makeService(em);

    const failure = service.revokeRole('u1', 'mentee');
    await expect(failure).rejects.toBeInstanceOf(LastRoleError);
    await expect(failure).rejects.toMatchObject({ status: 409 });
    expect(ada.roles).toEqual(['mentee']);
    expect(ada.sessionVersion).toBe(3);
  });

  it('throws NotFoundError for an unknown user', async () => {
    const { service } = makeService(em);
    await expect(service.grantRole('missing', 'mentor')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UserService.findOrCreateFromGithub — effective roles', () => {
  it('resolves operator live for the session the callback will issue', async () => {
    em = fakeEm([row({ id: 'u1', email: FOUNDER, githubId: '1001', roles: ['mentor'] })]);
    const { service } = makeService(em, [FOUNDER]);

    const result = await service.findOrCreateFromGithub(identity());

    expect(result.effectiveRoles).toEqual(['mentor', 'operator']);
  });

  it('is empty for an operator-only row removed from the allowlist', async () => {
    em = fakeEm([row({ id: 'u1', email: FOUNDER, githubId: '1001', roles: ['operator'] })]);
    const { service } = makeService(em, []);

    const result = await service.findOrCreateFromGithub(identity());

    expect(result.user.roles).toEqual(['operator']);
    expect(result.effectiveRoles).toEqual([]);
  });
});

describe('UserService.signOut', () => {
  it('bumps sessionVersion for a live session, under the row lock', async () => {
    const ada = row({ id: 'u1', email: 'ada@example.com' });
    em = fakeEm([ada]);
    const { service } = makeService(em);

    await expect(service.signOut({ userId: 'u1', sessionVersion: 3 })).resolves.toBe(true);

    expect(ada.sessionVersion).toBe(4);
    expect(em.findOne).toHaveBeenCalledWith(
      User,
      { id: 'u1' },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
  });

  it('changes nothing for a stale session version', async () => {
    const ada = row({ id: 'u1', email: 'ada@example.com' });
    em = fakeEm([ada]);
    const { service } = makeService(em);

    await expect(service.signOut({ userId: 'u1', sessionVersion: 2 })).resolves.toBe(false);
    expect(ada.sessionVersion).toBe(3);
  });

  it('changes nothing for an unknown user', async () => {
    const { service } = makeService(em);
    await expect(service.signOut({ userId: 'missing', sessionVersion: 0 })).resolves.toBe(false);
  });
});

const CLIENT_IP = '203.0.113.7';
// One trusted proxy hop (see makeService), so the client address is the last entry.
const REQ = new Request('https://devmentor.example/api/auth', {
  headers: { 'x-forwarded-for': `198.51.100.9, ${CLIENT_IP}` },
});
const REGISTRATION_CHECKS: RateLimitCheck[] = [
  { key: rateLimitKey('registration', 'ip', CLIENT_IP), policy: REGISTRATION_PER_IP },
];
const signInChecks = (email: string): RateLimitCheck[] => [
  { key: rateLimitKey('sign-in', 'ip', CLIENT_IP), policy: SIGN_IN_PER_IP },
  { key: rateLimitKey('sign-in', 'email', email), policy: SIGN_IN_PER_EMAIL },
];
const PASSWORD = 'correct horse battery';

const registration = (overrides: Partial<{ email: string; displayName: string; returnTo: string }> = {}) => ({
  email: 'new@example.com',
  password: PASSWORD,
  displayName: 'New Person',
  returnTo: '/mentors/7',
  ...overrides,
});

const login = (email = 'ada@example.com', password = PASSWORD) => ({ email, password });

describe('UserService.registerWithPassword — the state matrix', () => {
  it('creates an unverified mentee with the hash written, then mails the bound link', async () => {
    const { service, eventBus, steps, rateLimiter, emailVerificationService } = makeService(em);

    await expect(service.registerWithPassword(registration(), REQ)).resolves.toEqual({
      email: 'new@example.com',
    });

    expect(em.rows).toEqual([
      expect.objectContaining({
        id: 'new-1',
        email: 'new@example.com',
        displayName: 'New Person',
        roles: ['mentee'],
        passwordHash: `hash:${PASSWORD}`,
        emailVerifiedAt: null,
      }),
    ]);
    expect(em.findOne).toHaveBeenCalledWith(User, { email: 'new@example.com' }, {
      lockMode: LockMode.PESSIMISTIC_WRITE,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.created', {
      userId: 'new-1',
      email: 'new@example.com',
    });
    expect(emailVerificationService.send).toHaveBeenCalledWith(
      { id: 'new-1', email: 'new@example.com', passwordHash: `hash:${PASSWORD}` },
      '/mentors/7',
    );
    expect(rateLimiter.consumeAll).toHaveBeenCalledWith(REGISTRATION_CHECKS);
    // Gate slot, then limits, then the hash; the mail only after the commit.
    expect(steps).toEqual(['slot', 'consume', 'hash', 'mail']);
  });

  it.each([
    [
      'verified with a password',
      { passwordHash: 'hash:theirs', githubId: '42' },
      'account_exists',
      'This address already has an account. Sign in instead.',
    ],
    [
      'verified, GitHub only',
      { passwordHash: null, githubId: '42' },
      'github_account',
      'This address already has an account that signs in with GitHub. Use "Continue with GitHub" instead.',
    ],
    [
      'verified with neither password nor GitHub (a seeded row)',
      { passwordHash: null, githubId: null },
      'account_exists',
      'This address already has an account. Sign in instead.',
    ],
  ])('refuses an address %s with 409', async (_label, existing, reason, message) => {
    const ada = row({ id: 'u1', email: 'ada@example.com', ...existing });
    em = fakeEm([ada]);
    const { service, eventBus, emailVerificationService } = makeService(em);

    const error = await service
      .registerWithPassword(registration({ email: 'ada@example.com' }), REQ)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountExistsError);
    expect(error).toMatchObject({ status: 409, code: 'conflict', reason, message });
    expect(ada.passwordHash).toBe(existing.passwordHash);
    expect(ada.displayName).toBe('u1');
    expect(eventBus.emit).not.toHaveBeenCalled();
    expect(emailVerificationService.send).not.toHaveBeenCalled();
  });

  it.each([
    ['without a password', null],
    ['with an earlier password', 'hash:earlier attempt'],
  ])('claims an unverified row %s: writes the hash and mails a fresh link', async (_label, earlier) => {
    const ada = row({
      id: 'u1',
      email: 'ada@example.com',
      roles: ['mentee', 'mentor'],
      emailVerifiedAt: null,
      passwordHash: earlier,
    });
    em = fakeEm([ada]);
    const { service, eventBus, emailVerificationService } = makeService(em);

    await service.registerWithPassword(registration({ email: 'ada@example.com' }), REQ);

    expect(em.rows).toHaveLength(1);
    expect(ada).toMatchObject({
      passwordHash: `hash:${PASSWORD}`,
      displayName: 'New Person',
      roles: ['mentee', 'mentor'],
      emailVerifiedAt: null,
      sessionVersion: 3,
    });
    expect(eventBus.emit).not.toHaveBeenCalled();
    expect(emailVerificationService.send).toHaveBeenCalledWith(
      { id: 'u1', email: 'ada@example.com', passwordHash: `hash:${PASSWORD}` },
      '/mentors/7',
    );
  });

  it('a rate-limited attempt neither hashes nor reads users', async () => {
    const { service, steps, rateLimiter, slot } = makeService(em);
    const limited = new TooManyRequestsError(60);
    rateLimiter.consumeAll.mockRejectedValueOnce(limited);

    await expect(service.registerWithPassword(registration(), REQ)).rejects.toBe(limited);
    expect(steps).toEqual(['slot']);
    expect(slot.hash).not.toHaveBeenCalled();
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('reports a mail failure as 503 and leaves only the unverified row behind', async () => {
    const { service, emailVerificationService } = makeService(em);
    const failure = new ServiceUnavailableError('Mail delivery failed');
    emailVerificationService.send.mockRejectedValueOnce(failure);

    await expect(service.registerWithPassword(registration(), REQ)).rejects.toBe(failure);
    expect(em.rows).toEqual([
      expect.objectContaining({ email: 'new@example.com', emailVerifiedAt: null }),
    ]);
  });

  it('resolves the password collaborators only when a password flow runs', async () => {
    const { service, credentialsRead } = makeService(em);
    await service.findByEmail('ada@example.com');
    expect(credentialsRead).not.toHaveBeenCalled();
    await service.registerWithPassword(registration(), REQ);
    expect(credentialsRead).toHaveBeenCalled();
  });
});

describe('UserService.registerWithPassword — concurrent registration', () => {
  it('re-runs once on users_email_unique and claims the winning unverified row', async () => {
    const { service, eventBus, logger, emailVerificationService } = makeService(em);
    em.failNextFlush(() => {
      // The other registration committed its insert first.
      em.rows.push(
        row({ id: 'winner', email: 'new@example.com', emailVerifiedAt: null, passwordHash: 'hash:w' }),
      );
      return uniqueViolation('users_email_unique');
    });

    await service.registerWithPassword(registration(), REQ);

    expect(em.transactional).toHaveBeenCalledTimes(2);
    expect(em.rows).toEqual([
      expect.objectContaining({ id: 'winner', passwordHash: `hash:${PASSWORD}` }),
    ]);
    expect(eventBus.emit).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('password registration raced; re-reading');
    expect(emailVerificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'winner' }),
      '/mentors/7',
    );
  });

  it('answers 409 when the winner turns out verified', async () => {
    const { service } = makeService(em);
    em.failNextFlush(() => {
      em.rows.push(row({ id: 'winner', email: 'new@example.com', githubId: '7' }));
      return uniqueViolation('users_email_unique');
    });
    await expect(service.registerWithPassword(registration(), REQ)).rejects.toMatchObject({
      reason: 'github_account',
    });
  });

  it.each([
    ['a unique violation on another constraint', () => uniqueViolation('users_github_id_unique')],
    ['an error that is not a unique violation', () => new Error('boom')],
  ])('rethrows %s', async (_label, make) => {
    const { service } = makeService(em);
    const failure = make();
    em.failNextFlush(() => failure);
    await expect(service.registerWithPassword(registration(), REQ)).rejects.toBe(failure);
    expect(em.transactional).toHaveBeenCalledTimes(1);
  });

  it('retries only once', async () => {
    const { service } = makeService(em);
    const second = uniqueViolation('users_email_unique');
    em.failNextFlush(() => uniqueViolation('users_email_unique'));
    em.failNextFlush(() => second);
    await expect(service.registerWithPassword(registration(), REQ)).rejects.toBe(second);
    expect(em.transactional).toHaveBeenCalledTimes(2);
  });
});

describe('UserService.authenticateWithPassword', () => {
  const verifiedAda = (overrides: Partial<Row> = {}) =>
    row({
      id: 'u1',
      email: 'ada@example.com',
      roles: ['mentee', 'mentor'],
      passwordHash: `hash:${PASSWORD}`,
      mentorProfile: { id: 'mp1', headline: 'Compilers' },
      ...overrides,
    });

  it('signs in a verified row and preserves every stored role', async () => {
    em = fakeEm([verifiedAda()]);
    const { service, steps, rateLimiter, eventBus } = makeService(em);

    const result = await service.authenticateWithPassword(login(), REQ);

    expect(result).toEqual({
      user: expect.objectContaining({ id: 'u1', roles: ['mentee', 'mentor'] }),
      sessionVersion: 3,
      effectiveRoles: ['mentee', 'mentor'],
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(em.rows[0]).toMatchObject({ roles: ['mentee', 'mentor'], sessionVersion: 3 });
    expect(eventBus.emit).not.toHaveBeenCalled();
    expect(rateLimiter.consumeAll).toHaveBeenCalledWith(signInChecks('ada@example.com'));
    expect(steps).toEqual(['slot', 'consume', 'verify']);
    expect(em.findOne).toHaveBeenCalledWith(User, { email: 'ada@example.com' }, {
      populate: ['mentorProfile'],
    });
  });

  it('fails an unknown email and a wrong password byte-identically, both after a derivation', async () => {
    em = fakeEm([verifiedAda()]);
    const { service, slot } = makeService(em);

    const unknown = (await service
      .authenticateWithPassword(login('nobody@example.com'), REQ)
      .catch((caught: unknown) => caught)) as UnauthorizedError;
    const wrong = (await service
      .authenticateWithPassword(login('ada@example.com', 'wrong password!'), REQ)
      .catch((caught: unknown) => caught)) as UnauthorizedError;

    for (const error of [unknown, wrong]) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.constructor).toBe(UnauthorizedError);
    }
    expect(unknown.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(Buffer.from(unknown.message)).toEqual(Buffer.from(wrong.message));
    expect([unknown.status, unknown.code, unknown.name]).toEqual([wrong.status, wrong.code, wrong.name]);
    expect(slot.verify.mock.calls).toEqual([
      [PASSWORD, null],
      ['wrong password!', `hash:${PASSWORD}`],
    ]);
  });

  it('gives a GitHub-only row (no password) the same generic 401', async () => {
    em = fakeEm([verifiedAda({ passwordHash: null, githubId: '42' })]);
    const { service } = makeService(em);
    await expect(service.authenticateWithPassword(login(), REQ)).rejects.toMatchObject({
      constructor: UnauthorizedError,
      message: INVALID_CREDENTIALS_MESSAGE,
    });
  });

  it('refuses the right password before the email is verified, with the reason', async () => {
    em = fakeEm([verifiedAda({ emailVerifiedAt: null })]);
    const { service } = makeService(em);
    const error = await service
      .authenticateWithPassword(login(), REQ)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PasswordSignInRefusedError);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toMatchObject({
      status: 403,
      reason: 'email_unverified',
      message: 'Confirm your email address first. Open the link in the email we sent you, then sign in.',
    });
  });

  it('reconciles operator live for an allowlisted address', async () => {
    em = fakeEm([verifiedAda({ email: FOUNDER })]);
    const { service, eventBus } = makeService(em, [FOUNDER]);
    const result = await service.authenticateWithPassword(login(FOUNDER), REQ);
    expect(result.effectiveRoles).toEqual(['mentee', 'mentor', 'operator']);
    expect(em.rows[0]).toMatchObject({ roles: ['mentee', 'mentor', 'operator'], sessionVersion: 3 });
    expect(eventNames(eventBus)).toEqual(['auth.user.roles_changed']);
  });

  it('refuses an operator-only row no longer on the allowlist', async () => {
    em = fakeEm([verifiedAda({ roles: ['operator'] })]);
    const { service } = makeService(em);
    await expect(service.authenticateWithPassword(login(), REQ)).rejects.toMatchObject({
      constructor: PasswordSignInRefusedError,
      reason: 'no_active_role',
      message: 'This account has no active role. Ask an operator for access.',
    });
  });

  it('a rate-limited attempt never reads users or verifies', async () => {
    em = fakeEm([verifiedAda()]);
    const { service, rateLimiter, slot } = makeService(em);
    const limited = new TooManyRequestsError(30);
    rateLimiter.consumeAll.mockRejectedValueOnce(limited);
    await expect(service.authenticateWithPassword(login(), REQ)).rejects.toBe(limited);
    expect(em.findOne).not.toHaveBeenCalled();
    expect(slot.verify).not.toHaveBeenCalled();
  });
});

describe('UserService password flows — claiming issues no session until verification', () => {
  it('refuses sign-in after a claim, invalidates the earlier link, and signs in after the new one', async () => {
    const victim = row({
      id: '0b8f6a52-4a0e-4f8e-9a51-6f0d2c7e1a11',
      email: 'ada@example.com',
      emailVerifiedAt: null,
      passwordHash: 'hash:first attempt',
    });
    em = fakeEm([victim]);
    const env = parseAppEnv({ SESSION_SECRET: 's'.repeat(32), APP_URL: 'https://devmentor.example/' });
    const clock = { now: () => NOW };
    const links: string[] = [];
    const verification = new EmailVerificationService({
      em: em as unknown as EntityManager,
      tokenService: new TokenService({ env, clock }),
      sessionService: new SessionService({ env, clock }),
      userService: { reconcileOperator: (id: string) => service.reconcileOperator(id) },
      mailer: {
        send: async ({ text }) => {
          links.push(new URL(text.split('\n').find((line) => line.startsWith('https://'))!).searchParams.get('token')!);
        },
      },
      clock,
      env,
    });
    const { service } = makeService(em, [], null, verification);

    // The first registrant's link, bound to the hash the row held then.
    await verification.send({ id: victim.id, email: victim.email, passwordHash: 'hash:first attempt' });
    await service.registerWithPassword(registration({ email: 'ada@example.com' }), REQ);

    await expect(service.authenticateWithPassword(login(), REQ)).rejects.toMatchObject({
      reason: 'email_unverified',
    });
    await expect(
      service.authenticateWithPassword(login('ada@example.com', 'first attempt'), REQ),
    ).rejects.toMatchObject({ message: INVALID_CREDENTIALS_MESSAGE });
    await expect(verification.verify(links[0]!)).rejects.toMatchObject({ status: 400 });
    expect(victim.emailVerifiedAt).toBeNull();

    const verified = await verification.verify(links[1]!);
    expect(verified.cookie).toEqual(expect.any(String));
    await expect(service.authenticateWithPassword(login(), REQ)).resolves.toMatchObject({
      user: { id: victim.id },
      effectiveRoles: ['mentee'],
    });
  });
});
