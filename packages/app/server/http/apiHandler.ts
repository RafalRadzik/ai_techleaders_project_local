import "server-only";

import {
  API_CLIENT_HEADER,
  API_CLIENT_HEADER_VALUE,
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  type ApiFailure,
  type ApiSuccess,
} from "@devmentor/shared";
import { connection } from "next/server";
import { getRequestContainer, type AppContainer } from "@/server/container";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Status for domain rule violations that have no more specific error class.
const DOMAIN_ERROR_STATUS = 422;

export interface ApiHandlerArgs<TContext> {
  request: Request;
  context: TContext;
  /** The request scope. Resolve every service from it. */
  container: AppContainer;
}

export interface ApiHandlerOptions {
  /** Status of the success response, e.g. `201` for creates. Defaults to `200`. */
  successStatus?: number;
}

export type RouteHandler<TContext> = (request: Request, context: TContext) => Promise<Response>;

/**
 * Wraps a route handler: returns `{ ok: true, data }`, maps thrown `AppError`s to their status
 * and `{ ok: false, error }`, logs anything unexpected and answers it with a generic 500.
 * Rejects state-changing requests that don't carry the `apiCall` client header (CSRF).
 */
export function apiHandler<TData, TContext = unknown>(
  handler: (args: ApiHandlerArgs<TContext>) => Promise<TData>,
  { successStatus = 200 }: ApiHandlerOptions = {},
): RouteHandler<TContext> {
  return async (request, context) => {
    // Outside the try block: during prerendering `connection()` signals Next.js and must not be caught.
    await connection();
    const container = getRequestContainer();

    try {
      assertClientHeader(request);
      const data = await handler({ request, context, container });
      // `null` keeps `data` in the JSON body when a handler returns nothing.
      const body: ApiSuccess<TData | null> = { ok: true, data: data ?? null };
      return Response.json(body, { status: successStatus });
    } catch (error) {
      return errorResponse(error, request, container);
    }
  };
}

function assertClientHeader(request: Request): void {
  if (SAFE_METHODS.has(request.method)) {
    return;
  }
  if (request.headers.get(API_CLIENT_HEADER) !== API_CLIENT_HEADER_VALUE) {
    throw new ForbiddenError("Missing API client header");
  }
}

function errorResponse(error: unknown, request: Request, container: AppContainer): Response {
  if (error instanceof AppError) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    const body: ApiFailure = { ok: false, error: { code: error.code, message: error.message, fieldErrors } };
    return Response.json(body, { status: statusFor(error) });
  }

  container.resolve("logger").error("Unhandled error in API route", {
    method: request.method,
    path: new URL(request.url).pathname,
    error,
  });
  // Never leak internals (stack traces, SQL, hosts) to the client.
  const body: ApiFailure = {
    ok: false,
    error: { code: "internal_error", message: "Something went wrong. Please try again." },
  };
  return Response.json(body, { status: 500 });
}

function statusFor(error: AppError): number {
  if (error instanceof ValidationError) {
    return 400;
  }
  if (error instanceof UnauthorizedError) {
    return 401;
  }
  if (error instanceof ForbiddenError) {
    return 403;
  }
  if (error instanceof NotFoundError) {
    return 404;
  }
  if (error instanceof ConflictError) {
    return 409;
  }
  return DOMAIN_ERROR_STATUS;
}
