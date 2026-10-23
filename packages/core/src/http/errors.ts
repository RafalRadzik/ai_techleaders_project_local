/**
 * Typed application error hierarchy. Services throw these; nothing else builds an
 * HTTP response. `apiHandler` maps a thrown `AppError` to the right status code and
 * the shared JSON envelope — see `apiHandler.ts`.
 */
export type FieldErrors = Record<string, string[]>;

export type AppErrorOptions = {
  fieldErrors?: FieldErrors;
  cause?: unknown;
  /** Extra response headers `apiHandler` copies onto the error response. */
  headers?: Record<string, string>;
  /** Seconds until a retry can succeed; `apiHandler` puts it in the error envelope. */
  retryAfterSeconds?: number;
};

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;
  readonly headers?: Record<string, string>;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, code: string, options?: AppErrorOptions) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    // `new.target.name` gives the concrete subclass name (e.g. `NotFoundError`).
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
    this.headers = options?.headers;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', options?: { cause?: unknown }) {
    super(message, 400, 'bad_request', options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'unauthorized');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(message, 403, 'forbidden');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'not_found');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict with the current state of the resource') {
    super(message, 409, 'conflict');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', fieldErrors?: FieldErrors) {
    super(message, 422, 'validation_failed', { fieldErrors });
  }
}

/**
 * An integration the request depends on is unavailable: a credential is unset, an
 * upstream call failed or timed out, or a local capacity gate is saturated. Retryable.
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'Service temporarily unavailable',
    options?: { cause?: unknown; headers?: Record<string, string> },
  ) {
    super(message, 503, 'service_unavailable', options);
  }
}

/**
 * A rate limit (primitive B8) was exceeded. The message is deliberately generic — it never
 * says whether the email exists. `retryAfterSeconds` reaches the client twice: in the
 * envelope and as the `Retry-After` header.
 */
export class TooManyRequestsError extends AppError {
  constructor(retryAfterSeconds: number, message = 'Too many attempts. Try again later.') {
    super(message, 429, 'rate_limited', {
      retryAfterSeconds,
      headers: { 'retry-after': String(retryAfterSeconds) },
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
