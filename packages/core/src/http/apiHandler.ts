import { createLogger, type Logger } from '../logger';
import { requireCsrfHeader } from './auth';
import { type FieldErrors, isAppError } from './errors';

/**
 * The response envelope every `/api/*` route returns. This is a *shape convention*
 * shared with the client (`@devmentor/ui/backend/api`), which declares its own
 * matching type — `ui` must not import `core`, so the two are intentionally separate
 * declarations of the same shape.
 */
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fieldErrors?: FieldErrors };
};
export type ApiResponseBody<T> = ApiSuccess<T> | ApiFailure;

/** Next passes `params` as a promise in the route context (App Router). */
export type ApiRouteContext = { params: Promise<Record<string, string | string[]>> };

export type ApiRouteHandler = (req: Request, ctx: ApiRouteContext) => Promise<Response>;

/** Route logic: return the payload to wrap, or a `Response` to pass through as-is. */
export type RouteLogic = (req: Request, ctx: ApiRouteContext) => Promise<unknown> | unknown;

export interface ApiHandlerOptions {
  /**
   * Enforce `x-devmentor-request` on non-GET/HEAD/OPTIONS requests. Defaults to `true`.
   * `false` is reserved for the webhook route, which authenticates by signature (B13).
   */
  csrf?: boolean;
}

const CSRF_EXEMPT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let cachedLogger: Logger | undefined;
function logger(): Logger {
  return (cachedLogger ??= createLogger());
}

function json(status: number, body: ApiResponseBody<unknown>, headers?: HeadersInit): Response {
  const merged = new Headers(headers);
  merged.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers: merged });
}

/**
 * The success envelope. `headers` lets a route return it with extra headers — e.g. the
 * logout route's expiring `Set-Cookie` — by returning this `Response` from its logic.
 */
export function jsonOk<T>(data: T, status = 200, headers?: HeadersInit): Response {
  return json(status, { ok: true, data }, headers);
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldErrors,
  headers?: Record<string, string>,
): Response {
  return json(
    status,
    {
      ok: false,
      error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) },
    },
    headers,
  );
}

/**
 * Wrap a route function: run it, wrap its return value in the success envelope (or
 * pass through a `Response` it built itself), and turn any thrown `AppError` into the
 * matching status + failure envelope. Unexpected errors are logged via the shared
 * logger and returned as a generic 500 — a raw stack trace never reaches the client.
 *
 * Every route handler goes through this — no route writes its own `try/catch`.
 *
 * CSRF is enforced here, once: any method other than GET/HEAD/OPTIONS without the
 * `x-devmentor-request` header is answered 403 before `logic` runs, unless the route
 * opts out with `{ csrf: false }`.
 */
export function apiHandler(logic: RouteLogic, options: ApiHandlerOptions = {}): ApiRouteHandler {
  const csrf = options.csrf ?? true;
  return async (req, ctx) => {
    try {
      if (csrf && !CSRF_EXEMPT_METHODS.has(req.method.toUpperCase())) {
        requireCsrfHeader(req);
      }
      const result = await logic(req, ctx);
      return result instanceof Response ? result : jsonOk(result);
    } catch (error) {
      if (isAppError(error)) {
        return jsonError(
          error.status,
          error.code,
          error.message,
          error.fieldErrors,
          error.headers,
        );
      }
      logger().error({ err: error, path: req.url }, 'unhandled route error');
      return jsonError(500, 'internal_error', 'Something went wrong');
    }
  };
}
