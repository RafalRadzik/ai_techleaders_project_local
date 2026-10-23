import { pino, type Logger, type LoggerOptions } from 'pino';
import { getEnv, type AppEnv } from './config/env';

const SECRET_KEYS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'apiKey',
  'authorization',
  'cookie',
] as const;

/**
 * Fields censored wherever they appear at the top level or one object deep, plus request
 * and response header bags. `text` is intentionally absent: the log mailer writes the
 * message body under `text` so the integration harness can read the verification link,
 * and that adapter is never selectable in production (see `log-mailer.ts`).
 */
export const LOG_REDACT_PATHS: readonly string[] = [
  ...SECRET_KEYS.flatMap((key) => [key, `*.${key}`]),
  '*.headers.authorization',
  '*.headers.cookie',
  '*.headers["set-cookie"]',
];

export function loggerOptions(env: AppEnv): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    base: { app: env.APP_NAME },
    redact: { paths: [...LOG_REDACT_PATHS], censor: '[Redacted]' },
  };
}

/**
 * Root application logger. In development we keep raw JSON (no `pino-pretty` dep in
 * the base install); wire up a transport later if desired.
 */
export function createLogger(): Logger {
  return pino(loggerOptions(getEnv()));
}

export type { Logger };
