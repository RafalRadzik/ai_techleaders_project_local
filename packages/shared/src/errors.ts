/** Base class for expected, domain-level errors that can be shown to users. */
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
