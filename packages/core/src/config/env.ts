import { z } from 'zod';

/**
 * Treat an empty assignment (`SESSION_SECRET=` in `.env`, or an empty CI variable) as
 * unset, so an optional value is either absent or valid — never a blank string.
 */
function blankAsUnset<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema);
}

const optionalText = () => blankAsUnset(z.string().optional());

/**
 * `OPERATOR_EMAILS` is a comma-separated allowlist. Entries are trimmed and lowercased
 * so membership checks are case-insensitive; empty entries are dropped and every
 * remaining entry must be an email address.
 */
const operatorEmails = z
  .string()
  .default('')
  .transform((raw) =>
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry !== ''),
  )
  .pipe(z.array(z.email()));

/**
 * Application-wide environment schema. This is the single source of truth for config
 * across the app — nothing outside `core` (and `db`'s own narrow copy) should read
 * `process.env` directly. Add new config here so it is validated once at boot.
 *
 * Missing integration credentials are allowed here and fail closed at the route.
 * Required-in-production checks (`SESSION_SECRET`) live in `createContainer`, not in
 * this schema, because `getEnv()` also runs during `next build`. Only *dangerous*
 * combinations are refused at parse time (see `superRefine` below).
 */
const appEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_NAME: z.string().default('DevMentor'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    APP_URL: blankAsUnset(z.url().default('http://localhost:3000')),

    // Database — mirrors packages/db `env.ts`. Kept here too so config validation is
    // centralised; `db` reads its own copy for CLI use without importing `core`.
    DATABASE_URL: z.string().url().optional(),
    DB_HOST: z.string().default('127.0.0.1'),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_NAME: z.string().default('devmentor'),
    DB_USER: z.string().default('devmentor'),
    DB_PASSWORD: z.string().default('devmentor'),

    // Sessions. The previous secret keeps cookies signed before a rotation valid.
    SESSION_SECRET: blankAsUnset(z.string().min(32).optional()),
    SESSION_SECRET_PREVIOUS: blankAsUnset(z.string().min(32).optional()),

    // GitHub sign-in credentials — checked at the route, never at boot.
    GITHUB_CLIENT_ID: optionalText(),
    GITHUB_CLIENT_SECRET: optionalText(),
    OPERATOR_EMAILS: operatorEmails,
    TRUSTED_PROXY_HOPS: blankAsUnset(z.coerce.number().int().min(0).default(0)),

    // Password hashing gate (B9). Each scrypt hash holds ~128 MiB, so this bounds memory;
    // 4 matches libuv's default threadpool size. Callers past the limit wait up to
    // PASSWORD_HASH_WAIT_MS, then get a 503.
    PASSWORD_HASH_CONCURRENCY: blankAsUnset(z.coerce.number().int().min(1).default(4)),
    PASSWORD_HASH_WAIT_MS: blankAsUnset(z.coerce.number().int().min(0).default(5000)),

    // Test adapters are selected only together with INTEGRATION_TEST_RUN=1.
    AUTH_IDENTITY_ADAPTER: blankAsUnset(z.enum(['github', 'mock']).default('github')),
    INTEGRATION_TEST_RUN: blankAsUnset(
      z
        .enum(['0', '1'])
        .optional()
        .transform((value) => value === '1'),
    ),

    // Mail (B14). Selection lives in `createMailerAdapter`: unset MAILER_ADAPTER lets
    // development without MAIL_API_KEY fall back to the log mailer; production requires
    // MAIL_API_KEY and MAIL_FROM at container creation, not here (see SESSION_SECRET).
    MAILER_ADAPTER: blankAsUnset(z.enum(['resend', 'log']).optional()),
    MAIL_API_KEY: optionalText(),
    MAIL_FROM: optionalText(),
  })
  .superRefine((env, ctx) => {
    if (env.INTEGRATION_TEST_RUN) return;
    if (env.AUTH_IDENTITY_ADAPTER === 'mock') {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_IDENTITY_ADAPTER'],
        message: 'AUTH_IDENTITY_ADAPTER=mock is only allowed with INTEGRATION_TEST_RUN=1',
      });
    }
    if (env.MAILER_ADAPTER === 'log') {
      ctx.addIssue({
        code: 'custom',
        path: ['MAILER_ADAPTER'],
        message: 'MAILER_ADAPTER=log is only allowed with INTEGRATION_TEST_RUN=1',
      });
    }
  });

export type AppEnv = z.infer<typeof appEnvSchema>;

/** Raw variables as read from the process environment or a test fixture. */
export type RawEnv = Readonly<Record<string, string | undefined>>;

/** Validate an environment without caching. Throws a `ZodError` on invalid config. */
export function parseAppEnv(env: RawEnv): AppEnv {
  return appEnvSchema.parse(env);
}

let cached: AppEnv | undefined;

/** Parse and cache the validated application environment. */
export function getEnv(env: RawEnv = process.env): AppEnv {
  if (!cached) {
    cached = parseAppEnv(env);
  }
  return cached;
}
