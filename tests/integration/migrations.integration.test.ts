import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { integrationChildEnvironment } from './environment';

const execFileAsync = promisify(execFile);
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const BASELINE = 'Migration20260901142829';
const AUTH_IDENTITY = 'Migration20261023101145_auth_identity';
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
 * TC-MIGRATION-001 — `SDLC.md` requires a schema migration to ship an up *and* down
 * test. This owns its own PostgreSQL container (the shared harness database serves the
 * running app, so reverting it would break the other scenarios) and drives the real
 * `npm run db:migrate` / `db:migrate:down` CLI: baseline, then a row that predates the
 * migration, then `up` → `down` → `up`, asserting schema and backfill each way.
 */
describe('TC-MIGRATION-001 auth-identity migration up, down and up again', () => {
  let postgres: StartedPostgreSqlContainer | undefined;
  let environment: NodeJS.ProcessEnv;

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

    // The root `db:migrate` script nests a second `npm run`, which would swallow `--to`.
    await npm('run', 'migration:up', '--workspace', '@devmentor/db', '--', '--to', BASELINE);
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
    await npm('run', 'db:migrate');
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
    await npm('run', 'db:migrate');
    await expectMigratedSchema();
  }, 120_000);
});
