import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { integrationChildEnvironment } from './environment';

const execFileAsync = promisify(execFile);
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const BASELINE = 'Migration20260901142829';
const AUTH_IDENTITY = 'Migration20261023101145_auth_identity';
const AUTH_PASSWORD = 'Migration20261023134430_auth_password';
const AUTH_COLUMNS = [
  'avatar_url',
  'email_verified_at',
  'github_id',
  'github_login',
  'roles',
  'session_version',
];
const PRE_EXISTING_EMAIL = 'founder@devmentor.dev';

/**
 * `SDLC.md` requires a schema migration to ship an up *and* down test. This owns its own
 * PostgreSQL container (the shared harness database serves the running app, so reverting
 * it would break the other scenarios) and drives the real migration CLI: baseline, then a
 * row that predates every later migration, then `up` → `down` → `up` per migration,
 * asserting schema and existing rows each way.
 *
 * TC-MIGRATION-001 covers `auth-identity` (migrated `--to` it, so later migrations stay
 * pending); TC-MIGRATION-002 then covers `auth-password` on top of it.
 */
describe('TC-MIGRATION-001 auth-identity migration up, down and up again', () => {
  let postgres: StartedPostgreSqlContainer | undefined;
  let environment: NodeJS.ProcessEnv;

  // The root `db:migrate` script nests a second `npm run`, which would swallow `--to`.
  const migrateTo = (name: string) =>
    npm('run', 'migration:up', '--workspace', '@devmentor/db', '--', '--to', name);

  async function npm(...args: string[]): Promise<void> {
    await execFileAsync(npmExecutable, args, {
      cwd: process.cwd(),
      env: environment,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120_000,
    });
  }

  async function sql(statement: string): Promise<{ ok: boolean; rows: string[]; error: string }> {
    const result = await postgres!.exec([
      'psql',
      '-U',
      'devmentor',
      '-d',
      'devmentor_migrations',
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
      '-c',
      statement,
    ]);
    return {
      ok: result.exitCode === 0,
      rows: result.stdout.split('\n').filter((line) => line.length > 0),
      error: result.stderr,
    };
  }

  async function query(statement: string): Promise<string[]> {
    const result = await sql(statement);
    if (!result.ok) throw new Error(`${statement}\n${result.error}`);
    return result.rows;
  }

  const authColumns = () =>
    query(
      `select column_name || ' ' || data_type || ' ' || coalesce(character_maximum_length::text, '-') || ' ' || is_nullable || ' ' || coalesce(column_default, '-')
       from information_schema.columns
       where table_name = 'users' and column_name in (${AUTH_COLUMNS.map((c) => `'${c}'`).join(', ')})
       order by column_name`,
    );
  const userConstraints = () =>
    query(
      `select conname from pg_constraint where conrelid = 'users'::regclass order by conname`,
    );
  const executed = () => query(`select name from mikro_orm_migrations order by id`);
  const insertUser = (email: string, roles?: string) =>
    sql(
      `insert into users (id, created_at, updated_at, email, display_name${roles === undefined ? '' : ', roles'})
       values (gen_random_uuid(), now(), now(), '${email}', 'Check'${roles === undefined ? '' : `, ${roles}`})`,
    );

  async function expectMigratedSchema(): Promise<void> {
    expect(await executed()).toEqual([BASELINE, AUTH_IDENTITY]);
    expect(await authColumns()).toEqual([
      'avatar_url text - YES -',
      'email_verified_at timestamp with time zone - YES -',
      'github_id character varying 64 YES -',
      'github_login character varying 64 YES -',
      `roles ARRAY - NO '{mentee}'::text[]`,
      'session_version integer - NO 0',
    ]);
    expect(await query(`select udt_name from information_schema.columns where table_name = 'users' and column_name = 'roles'`)).toEqual(['_text']);
    expect(await userConstraints()).toEqual([
      'users_email_unique',
      'users_github_id_unique',
      'users_pkey',
      'users_roles_check',
    ]);

    // Backfill: the row that predates the migration is verified and gets the defaults.
    expect(
      await query(
        `select roles::text, session_version, email_verified_at is not null, github_id is null
         from users where email = '${PRE_EXISTING_EMAIL}'`,
      ),
    ).toEqual(['{mentee}|0|t|t']);
    expect(await query(`select count(*) from users where email_verified_at is null`)).toEqual(['0']);

    // The roles CHECK: empty, null members and out-of-union values are refused.
    for (const roles of [`'{}'`, `array[null]::text[]`, `'{mentor,NULL}'`, `'{admin}'`, `null`]) {
      const result = await insertUser('rejected@devmentor.test', roles);
      expect(result.ok, `roles ${roles} must be refused`).toBe(false);
    }
    // Combined roles are accepted; duplicates are an application invariant, not a DB one.
    expect((await insertUser('combined@devmentor.test', `'{mentor,operator}'`)).ok).toBe(true);
    expect((await insertUser('duplicate@devmentor.test', `'{mentor,mentor}'`)).ok).toBe(true);
    // A new row without explicit values takes the defaults and stays unverified.
    expect((await insertUser('fresh@devmentor.test')).ok).toBe(true);
    expect(
      await query(
        `select roles::text, session_version, email_verified_at is null from users where email = 'fresh@devmentor.test'`,
      ),
    ).toEqual(['{mentee}|0|t']);
    // github_id is unique.
    await query(`update users set github_id = '42' where email = 'combined@devmentor.test'`);
    expect(
      (await sql(`update users set github_id = '42' where email = 'duplicate@devmentor.test'`)).ok,
    ).toBe(false);

    await query(`delete from users where email <> '${PRE_EXISTING_EMAIL}'`);
  }

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('devmentor_migrations')
      .withUsername('devmentor')
      .withPassword('devmentor')
      .start();
    environment = integrationChildEnvironment(postgres.getConnectionUri());

    await migrateTo(BASELINE);
    expect(await executed()).toEqual([BASELINE]);
    await query(
      `insert into users (id, created_at, updated_at, email, display_name)
       values (gen_random_uuid(), now(), now(), '${PRE_EXISTING_EMAIL}', 'Founder')`,
    );
  });

  afterAll(async () => {
    await postgres?.stop();
  });

  it('up adds the columns and constraints and backfills existing rows as verified', async () => {
    await migrateTo(AUTH_IDENTITY);
    await expectMigratedSchema();
  }, 120_000);

  it('down removes every column and constraint and keeps the existing row', async () => {
    await npm('run', 'db:migrate:down');

    expect(await executed()).toEqual([BASELINE]);
    expect(await authColumns()).toEqual([]);
    expect(await userConstraints()).toEqual(['users_email_unique', 'users_pkey']);
    expect(await query(`select display_name from users`)).toEqual(['Founder']);
  }, 120_000);

  it('up again restores the schema and backfills once more', async () => {
    await migrateTo(AUTH_IDENTITY);
    await expectMigratedSchema();
  }, 120_000);

  describe('TC-MIGRATION-002 auth-password migration up, down and up again', () => {
    const passwordColumn = () =>
      query(
        `select column_name || ' ' || data_type || ' ' || is_nullable || ' ' || coalesce(column_default, '-')
         from information_schema.columns
         where table_name = 'users' and column_name = 'password_hash'`,
      );

    async function expectPasswordSchema(): Promise<void> {
      expect(await executed()).toEqual([BASELINE, AUTH_IDENTITY, AUTH_PASSWORD]);
      expect(await passwordColumn()).toEqual(['password_hash text YES -']);
      // The row that predates the migration survives and is GitHub-only (no hash).
      expect(
        await query(
          `select display_name, password_hash is null, email_verified_at is not null
           from users where email = '${PRE_EXISTING_EMAIL}'`,
        ),
      ).toEqual(['Founder|t|t']);
      // A hash longer than bcrypt's 60 characters fits: the column is not width-pinned.
      const hash = `scrypt$N=131072,r=8,p=1$${'s'.repeat(24)}$${'k'.repeat(88)}`;
      expect(
        (
          await sql(
            `insert into users (id, created_at, updated_at, email, display_name, password_hash)
             values (gen_random_uuid(), now(), now(), 'password@devmentor.test', 'Password', '${hash}')`,
          )
        ).ok,
      ).toBe(true);
      expect(
        await query(`select password_hash from users where email = 'password@devmentor.test'`),
      ).toEqual([hash]);
      await query(`delete from users where email <> '${PRE_EXISTING_EMAIL}'`);
    }

    it('up adds a nullable text password_hash and keeps existing rows', async () => {
      await migrateTo(AUTH_PASSWORD);
      await expectPasswordSchema();
    }, 120_000);

    it('down drops only password_hash and keeps the row and the auth-identity schema', async () => {
      await query(
        `update users set password_hash = 'scrypt$x$y$z' where email = '${PRE_EXISTING_EMAIL}'`,
      );
      await npm('run', 'db:migrate:down');

      expect(await executed()).toEqual([BASELINE, AUTH_IDENTITY]);
      expect(await passwordColumn()).toEqual([]);
      expect(await authColumns()).toHaveLength(AUTH_COLUMNS.length);
      expect(await query(`select display_name from users`)).toEqual(['Founder']);
    }, 120_000);

    it('up again restores password_hash, null for the surviving row', async () => {
      await npm('run', 'db:migrate');
      await expectPasswordSchema();
    }, 120_000);
  });
});
