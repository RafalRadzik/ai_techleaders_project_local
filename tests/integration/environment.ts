import { randomBytes } from 'node:crypto';

/**
 * Test infrastructure is the sole exception to the application's config rule: it
 * inherits the parent environment only to pass an ephemeral database URL to child
 * processes. Production code continues to read environment through zod config.
 *
 * `appUrl` is the served origin. The mock identity adapter redirects the browser to
 * `${APP_URL}/api/auth/github/callback`, so it must be the harness's own random-port
 * origin — the default `http://localhost:3000` would send sign-in to another host, where
 * the OAuth state cookie is not sent.
 */
export function integrationChildEnvironment(
  databaseUrl: string,
  appUrl?: string,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...(appUrl ? { APP_URL: appUrl } : {}),
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: databaseUrl,
    DB_POOL_MIN: '0',
    DB_POOL_MAX: '5',
    // Keep migration:up aligned with the repository's committed snapshot name so a
    // test run never creates a duplicate migrations/devmentor.json artifact.
    MIKRO_ORM_MIGRATIONS_SNAPSHOT_NAME: '.snapshot-devmentor',
    // A fresh, throwaway signing secret per run; production mode requires one.
    SESSION_SECRET: randomBytes(48).toString('base64'),
    // Fake adapters are accepted only together with INTEGRATION_TEST_RUN=1.
    AUTH_IDENTITY_ADAPTER: 'mock',
    INTEGRATION_TEST_RUN: '1',
    OPERATOR_EMAILS: 'mock-operator@devmentor.test',
  };
}
