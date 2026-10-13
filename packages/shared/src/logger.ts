export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/** Keys whose values never reach a log line (matched case-insensitively, at any depth). */
export const DEFAULT_REDACTED_KEYS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "jwt",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
] as const;

const REDACTED = "[REDACTED]";
// Guards against cyclic or very deep objects.
const MAX_DEPTH = 6;

interface ConsoleLoggerOptions {
  redactKeys?: readonly string[];
}

export function createConsoleLogger({ redactKeys = DEFAULT_REDACTED_KEYS }: ConsoleLoggerOptions = {}): Logger {
  const redacted = new Set(redactKeys.map((key) => key.toLowerCase()));
  const write =
    (sink: (...data: unknown[]) => void, level: string) =>
    (message: string, context?: LogContext): void => {
      const entry = { level, time: new Date().toISOString(), message, ...sanitize(context ?? {}, redacted, 0) };
      sink(JSON.stringify(entry));
    };

  return {
    debug: write(console.debug, "debug"),
    info: write(console.info, "info"),
    warn: write(console.warn, "warn"),
    error: write(console.error, "error"),
  };
}

function sanitize(value: unknown, redacted: ReadonlySet<string>, depth: number): Record<string, unknown> {
  const result = sanitizeValue(value, redacted, depth);
  return isPlainRecord(result) ? result : { value: result };
}

function sanitizeValue(value: unknown, redacted: ReadonlySet<string>, depth: number): unknown {
  if (depth > MAX_DEPTH) {
    return "[Truncated]";
  }
  if (value instanceof Error) {
    const code = "code" in value && typeof value.code === "string" ? value.code : undefined;
    return {
      name: value.name,
      message: value.message,
      ...(code === undefined ? {} : { code }),
      stack: value.stack,
      ...(value.cause === undefined ? {} : { cause: sanitizeValue(value.cause, redacted, depth + 1) }),
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, redacted, depth + 1));
  }
  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        redacted.has(key.toLowerCase()) ? REDACTED : sanitizeValue(item, redacted, depth + 1),
      ]),
    );
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}
