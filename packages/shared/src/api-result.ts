/**
 * JSON envelope returned by every `/api/*` route built with `apiHandler`/`makeCrudRoute`
 * and parsed by `apiCall` on the client.
 */
export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiErrorBody;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/**
 * CSRF guard: `apiCall` always sends this header and `apiHandler` rejects state-changing
 * requests without it. A cross-site HTML form post can't set custom headers.
 */
export const API_CLIENT_HEADER = "x-devmentor-client";
export const API_CLIENT_HEADER_VALUE = "1";
