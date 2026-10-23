import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  EventBus,
  PasswordService,
  RateLimiter,
  UserService,
  type AppEnv,
  type EmailVerificationService,
  type GithubIdentity,
  type Logger,
  type VerificationRecipient,
} from '@devmentor/core';
import { entities, MikroORM } from '@devmentor/db';
import { integrationChildEnvironment } from './environment';

const execFileAsync = promisify(execFile);
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let postgres: StartedPostgreSqlContainer | undefined;
let orm: MikroORM | undefined;

beforeAll(async () => {
  postgres = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('devmentor_race')
    .withUsername('devmentor')
    .withPassword('devmentor')
    .start();
  await execFileAsync(npmExecutable, ['run', 'db:migrate'], {
    cwd: process.cwd(),
    env: integrationChildEnvironment(postgres.getConnectionUri()),
    maxBuffer: 20 * 1024 * 1024,
    timeout: 120_000,
  });
  orm = await MikroORM.init({
    clientUrl: postgres.getConnectionUri(),
    entities,
    pool: { min: 0, max: 6 },
  });
  await orm.connect();
});

afterAll(async () => {
  await orm?.close(true);
  await postgres?.stop();
});

const clock = { now: () => new Date() };
const passwordService = new PasswordService({
  env: { PASSWORD_HASH_CONCURRENCY: 4, PASSWORD_HASH_WAIT_MS: 30_000 } as AppEnv,
});

function service(
  logger: Logger,
  eventBus: EventBus,
  emailVerificationService: Pick<EmailVerificationService, 'send'> = { send: vi.fn() },
): UserService {
  // One forked EntityManager per caller, as two request scopes would have.
  const em = orm!.em.fork();
  return new UserService({
    em,
    logger,
    eventBus,
    clock,
    // No trusted proxy hop: registration then carries no per-IP check.
    env: { OPERATOR_EMAILS: [], TRUSTED_PROXY_HOPS: 0 },
    session: Promise.resolve(null),
    passwordService,
    rateLimiter: new RateLimiter({ em, clock }),
    emailVerificationService,
  });
}

async function waitingOnLock(): Promise<number> {
  const [row] = await orm!.em
    .fork()
    .execute<{ waiting: number }[]>(
      `select count(*)::int as waiting from pg_stat_activity
       where datname = current_database() and wait_event_type = 'Lock'`,
    );
  return row!.waiting;
}

/**
 * TC-AUTH-RACE-001 — two first sign-ins for the same new GitHub identity run at once.
 * Both transactions miss every lookup and both insert; the loser trips a unique
 * constraint, re-reads the winner's committed row, and both callers succeed with one
 * account. The race is made deterministic: an `ACCESS EXCLUSIVE` lock on `users` holds
 * both lookups until Postgres reports both sessions waiting, then releases them together.
 */
describe('TC-AUTH-RACE-001 concurrent GitHub first sign-in', () => {
  it('resolves to one row and two successful sign-ins', async () => {
    const identity: GithubIdentity = {
      githubId: '424242',
      login: 'racer',
      email: 'racer@devmentor.test',
      avatarUrl: null,
    };
    const logger = { info: vi.fn(), error: vi.fn() } as unknown as Logger;
    const created = vi.fn();
    const eventBus = new EventBus({ logger });
    eventBus.on('auth.user.created', created);

    const locker = orm!.em.fork();
    await locker.begin();
    await locker.execute('lock table users in access exclusive mode');

    const first = service(logger, eventBus);
    const second = service(logger, eventBus);
    const attempts = Promise.allSettled([
      first.findOrCreateFromGithub(identity),
      second.findOrCreateFromGithub(identity),
    ]);

    await vi.waitFor(async () => expect(await waitingOnLock()).toBe(2), {
      timeout: 10_000,
      interval: 50,
    });
    await locker.commit();
    const results = await attempts;

    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled']);
    const [a, b] = results.map((result) => (result as PromiseFulfilledResult<
      Awaited<ReturnType<UserService['findOrCreateFromGithub']>>
    >).value);
    expect(a!.user.id).toBe(b!.user.id);
    expect([a!.created, b!.created].sort()).toEqual([false, true]);
    expect(a!.user.roles).toEqual(['mentee']);
    expect(b!.user.roles).toEqual(['mentee']);
    expect(created).toHaveBeenCalledTimes(1);
    // The losing transaction really hit the constraint and re-read the winner.
    expect(logger.info).toHaveBeenCalledWith(
      { githubId: '424242' },
      'github sign-in raced; re-reading',
    );

    const rows = await orm!.em
      .fork()
      .execute<{ id: string; github_id: string; email_verified: boolean }[]>(
        `select id, github_id, email_verified_at is not null as email_verified
         from users where email = 'racer@devmentor.test'`,
      );
    expect(rows).toEqual([{ id: a!.user.id, github_id: '424242', email_verified: true }]);
  }, 60_000);
});

/**
 * TC-AUTH-RACE-002 — two registrations for the same new address run at once. Both hash,
 * both miss the lookup and both insert; the loser trips `users_email_unique`, re-runs its
 * transaction once and claims the winner's still-unverified row. One account, one
 * `auth.user.created`, two mailed links — and the row ends up holding exactly the hash the
 * loser's link is bound to, so only one of the two links can verify.
 *
 * A table lock (as in RACE-001) is not deterministic here: a `select` that waited on it may
 * take its snapshot after the other transaction committed, and then simply claims. Instead
 * an uncommitted placeholder row holds both inserts on the unique index until both are
 * waiting; rolling it back lets one insert win while the other still waits on the winner.
 */
describe('TC-AUTH-RACE-002 concurrent registration for one new address', () => {
  it('resolves to one unverified row, one creation event and two mails', async () => {
    const email = 'register-racer@devmentor.test';
    const passwords = ['first racer password', 'second racer password'];
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Logger;
    const created = vi.fn();
    const eventBus = new EventBus({ logger });
    eventBus.on('auth.user.created', created);
    const sent: VerificationRecipient[] = [];
    const mail = { send: vi.fn(async (recipient: VerificationRecipient) => void sent.push(recipient)) };

    // An uncommitted row for the address: invisible to both lookups, so both miss, yet both
    // inserts queue behind it on `users_email_unique`.
    const locker = orm!.em.fork();
    await locker.begin();
    await locker.execute(
      `insert into users (id, created_at, updated_at, email, display_name)
       values (gen_random_uuid(), now(), now(), '${email}', 'placeholder')`,
    );

    const request = new Request('http://localhost/api/auth/register');
    const attempts = Promise.allSettled(
      passwords.map((password, index) =>
        service(logger, eventBus, mail).registerWithPassword(
          { email, password, displayName: `Racer ${index}` },
          request,
        ),
      ),
    );

    await vi.waitFor(async () => expect(await waitingOnLock()).toBe(2), {
      timeout: 20_000,
      interval: 50,
    });
    await locker.rollback();
    const results = await attempts;

    expect(results).toEqual([
      { status: 'fulfilled', value: { email } },
      { status: 'fulfilled', value: { email } },
    ]);
    expect(created).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('password registration raced; re-reading');

    const rows = await orm!.em
      .fork()
      .execute<{ id: string; password_hash: string; verified: boolean; roles: string[] }[]>(
        `select id, password_hash, email_verified_at is not null as verified, roles
         from users where email = '${email}'`,
      );
    expect(rows).toHaveLength(1);
    const [stored] = rows;
    expect(stored).toMatchObject({ verified: false, roles: ['mentee'] });

    expect(sent).toHaveLength(2);
    expect(sent.every((recipient) => recipient.id === stored!.id)).toBe(true);
    expect(sent.filter((recipient) => recipient.passwordHash === stored!.password_hash)).toHaveLength(1);
    const matches = await Promise.all(
      passwords.map((password) => passwordService.verify(password, stored!.password_hash)),
    );
    expect(matches.filter(Boolean)).toHaveLength(1);
  }, 60_000);
});
