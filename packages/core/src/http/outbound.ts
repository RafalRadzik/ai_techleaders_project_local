import { ServiceUnavailableError } from './errors';

/** Node's `fetch` has no default timeout; every outbound call gets this one unless overridden. */
export const DEFAULT_OUTBOUND_TIMEOUT_MS = 10_000;

/** The slice of the pino logger `fetchJson` needs, so callers pass their own instance. */
export type OutboundLogger = {
  warn(details: Record<string, unknown>, message: string): void;
};

export type FetchJsonInit = RequestInit & {
  timeoutMs?: number;
  logger?: OutboundLogger;
};

export type UpstreamFailureReason =
  | 'timeout'
  | 'aborted'
  | 'network'
  | 'status'
  | 'invalid_response';

/**
 * The `cause` of every `ServiceUnavailableError` thrown by `fetchJson`. The URL is reduced
 * to origin and path so query-string secrets (OAuth codes, tokens) are never retained;
 * the request body and headers are never part of it.
 */
export type UpstreamFailure = {
  reason: UpstreamFailureReason;
  method: string;
  url: string;
  status?: number;
  error?: unknown;
};

function redactUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}

function classify(error: unknown, fallback: UpstreamFailureReason): UpstreamFailureReason {
  const name = error instanceof Error ? error.name : undefined;
  if (name === 'TimeoutError') return 'timeout';
  if (name === 'AbortError') return 'aborted';
  return fallback;
}

/**
 * Call an upstream JSON API with a bounded wait. A timeout, an aborted caller signal, a
 * network failure, a non-2xx answer, or a body that is not JSON all throw
 * `ServiceUnavailableError`, whose `cause` is an `UpstreamFailure` carrying the upstream
 * status. Failures are logged through the optional `logger` without the request body or
 * headers.
 */
export async function fetchJson<T>(url: string, init: FetchJsonInit): Promise<T> {
  const { timeoutMs = DEFAULT_OUTBOUND_TIMEOUT_MS, logger, ...requestInit } = init;
  const method = (requestInit.method ?? 'GET').toUpperCase();
  const safeUrl = redactUrl(url);

  const fail = (
    reason: UpstreamFailureReason,
    details: { status?: number; error?: unknown },
  ): ServiceUnavailableError => {
    const cause: UpstreamFailure = { reason, method, url: safeUrl, ...details };
    logger?.warn(
      {
        upstream: { reason, method, url: safeUrl, status: details.status },
        err: details.error,
      },
      'outbound request failed',
    );
    return new ServiceUnavailableError(undefined, { cause });
  };

  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = requestInit.signal
    ? AbortSignal.any([requestInit.signal, timeout])
    : timeout;

  let response: Response;
  try {
    response = await fetch(url, { ...requestInit, signal });
  } catch (error) {
    throw fail(classify(error, 'network'), { error });
  }

  if (!response.ok) {
    throw fail('status', { status: response.status });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw fail(classify(error, 'invalid_response'), { status: response.status, error });
  }
}
