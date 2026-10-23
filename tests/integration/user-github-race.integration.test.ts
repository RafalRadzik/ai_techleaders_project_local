import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { EventBus, UserService, type GithubIdentity, type Logger } from '@devmentor/core';
import { entities, MikroORM } from '@devmentor/db';
import { integrationChildEnvironment } from './environment';

const execFileAsync = promisify(execFile);
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * TC-AUTH-RACE-001 — two first sign-ins for the same new GitHub identity run at once.
 * Both transactions miss every lookup and both insert; the loser trips a unique
 * constraint, re-reads the winner's committed row, and both callers succeed with one
 * account. The race is made deterministic: an `ACCESS EXCLUSIVE` lock on `users` holds
 * both lookups until Postgres reports both sessions waiting, then releases them together.
 */
describe('TC-AUTH-RACE-001 concurrent GitHub first sign-in', () => {
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

  function service(logger: Logger, eventBus: EventBus): UserService {
    return new UserService({
      // One forked EntityManager per caller, as two request scopes would have.
      em: orm!.em.fork(),
      logger,
      eventBus,
      clock: { now: () => new Date() },
      env: { OPERATOR_EMAILS: [] },
      session: Promise.resolve(null),
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
