import type { FieldErrors } from "./api-result";

/**
 * Base class for expected, domain-level errors that can be shown to users.
 * Services throw these (never HTTP responses); `apiHandler` maps them to status codes.
 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", options?: ErrorOptions) {
    super("not_found", message, options);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", options?: ErrorOptions) {
    super("unauthorized", message, options);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", options?: ErrorOptions) {
    super("forbidden", message, options);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", options?: ErrorOptions) {
    super("conflict", message, options);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Validation failed",
    readonly fieldErrors: FieldErrors = {},
    options?: ErrorOptions,
  ) {
    super("validation_failed", message, options);
    this.name = "ValidationError";
  }
}
