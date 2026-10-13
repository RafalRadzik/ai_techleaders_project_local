import {
  API_CLIENT_HEADER,
  API_CLIENT_HEADER_VALUE,
  type ApiFailure,
  type ApiResult,
  type FieldErrors,
} from "@devmentor/shared";

export type ApiPath = `/api/${string}`;

export interface ApiCallOptions extends Omit<RequestInit, "body"> {
  /** Request body, serialised as JSON. */
  json?: unknown;
}

/**
 * The only sanctioned `fetch()` call site for `/api/*`. Never throws for HTTP, network or
 * parse failures: it always resolves to the `{ ok, data | error }` envelope.
 * `data` is typed by the caller and not validated at runtime.
 */
export async function apiCall<T>(path: ApiPath, { json, headers, ...init }: ApiCallOptions = {}): Promise<ApiResult<T>> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set(API_CLIENT_HEADER, API_CLIENT_HEADER_VALUE);
  requestHeaders.set("accept", "application/json");
  if (json !== undefined) {
    requestHeaders.set("content-type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: requestHeaders,
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  } catch (error) {
    if (init.signal?.aborted) {
      return failure("aborted", "The request was cancelled.");
    }
    console.warn("apiCall: network error", { path, error });
    return failure("network_error", "Could not reach the server. Check your connection and try again.");
  }

  const body = await readJsonSafe(response);
  if (isApiResult<T>(body)) {
    return body;
  }
  return failure("invalid_response", `Unexpected response from the server (HTTP ${response.status}).`);
}

export class ApiCallError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiCallError";
  }
}

/** Like `apiCall`, but returns `data` directly and throws `ApiCallError` on failure. */
export async function apiCallOrThrow<T>(path: ApiPath, options?: ApiCallOptions): Promise<T> {
  const result = await apiCall<T>(path, options);
  if (!result.ok) {
    throw new ApiCallError(result.error.code, result.error.message, result.error.fieldErrors);
  }
  return result.data;
}

async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Not JSON (e.g. an HTML error page from a proxy): the caller reports `invalid_response`.
    return undefined;
  }
}

function isApiResult<T>(body: unknown): body is ApiResult<T> {
  if (typeof body !== "object" || body === null || !("ok" in body)) {
    return false;
  }
  if (body.ok === true) {
    return "data" in body;
  }
  if (body.ok !== false || !("error" in body) || typeof body.error !== "object" || body.error === null) {
    return false;
  }
  const { error } = body;
  return "code" in error && typeof error.code === "string" && "message" in error && typeof error.message === "string";
}

function failure(code: string, message: string): ApiFailure {
  return { ok: false, error: { code, message } };
}
