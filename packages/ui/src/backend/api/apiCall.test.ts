import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiCall, ApiCallError, apiCallOrThrow } from "./apiCall";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

function respond(body: string, status = 200) {
  fetchMock.mockResolvedValue(new Response(body, { status }));
}

function lastRequest(): { path: string; init: RequestInit; headers: Headers } {
  const [path, init = {}] = fetchMock.mock.lastCall ?? [];
  return { path: String(path), init, headers: new Headers(init.headers) };
}

describe("apiCall", () => {
  it("sends the client and accept headers without a body by default", async () => {
    respond(JSON.stringify({ ok: true, data: [1, 2] }));

    await expect(apiCall<number[]>("/api/users")).resolves.toEqual({ ok: true, data: [1, 2] });

    const { path, init, headers } = lastRequest();
    expect(path).toBe("/api/users");
    expect(init.body).toBeUndefined();
    expect(headers.get("x-devmentor-client")).toBe("1");
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.has("content-type")).toBe(false);
  });

  it("serialises the json option and keeps caller headers and init", async () => {
    respond(JSON.stringify({ ok: true, data: { id: "1" } }), 201);

    await apiCall("/api/users", { method: "POST", json: { name: "Ada" }, headers: { "x-extra": "yes" } });

    const { init, headers } = lastRequest();
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"name":"Ada"}');
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-extra")).toBe("yes");
  });

  it("returns API failures as they are", async () => {
    const failure = { ok: false, error: { code: "conflict", message: "Taken", fieldErrors: { email: ["Taken"] } } };
    respond(JSON.stringify(failure), 409);

    await expect(apiCall("/api/users")).resolves.toEqual(failure);
  });

  it("reports a cancelled request", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));

    await expect(apiCall("/api/users", { signal: controller.signal })).resolves.toEqual({
      ok: false,
      error: { code: "aborted", message: "The request was cancelled." },
    });
  });

  it("reports network errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValue(error);

    await expect(apiCall("/api/users")).resolves.toEqual({
      ok: false,
      error: { code: "network_error", message: "Could not reach the server. Check your connection and try again." },
    });
    expect(warn).toHaveBeenCalledWith("apiCall: network error", { path: "/api/users", error });
  });

  it.each([
    { label: "an empty body", body: "" },
    { label: "a non-JSON body", body: "<html>Bad gateway</html>" },
    { label: "JSON null", body: "null" },
    { label: "a JSON primitive", body: "42" },
    { label: "an object without ok", body: "{}" },
    { label: "a success without data", body: '{"ok":true}' },
    { label: "a non-boolean ok", body: '{"ok":"yes","error":{"code":"x","message":"y"}}' },
    { label: "a failure without error", body: '{"ok":false}' },
    { label: "a failure with a null error", body: '{"ok":false,"error":null}' },
    { label: "a failure with a non-object error", body: '{"ok":false,"error":"boom"}' },
    { label: "a failure without code", body: '{"ok":false,"error":{"message":"m"}}' },
    { label: "a failure with a non-string code", body: '{"ok":false,"error":{"code":1,"message":"m"}}' },
    { label: "a failure without message", body: '{"ok":false,"error":{"code":"c"}}' },
    { label: "a failure with a non-string message", body: '{"ok":false,"error":{"code":"c","message":1}}' },
  ])("rejects $label as an invalid response", async ({ body }) => {
    respond(body, 502);

    await expect(apiCall("/api/users")).resolves.toEqual({
      ok: false,
      error: { code: "invalid_response", message: "Unexpected response from the server (HTTP 502)." },
    });
  });
});

describe("apiCallOrThrow", () => {
  it("returns data on success", async () => {
    respond(JSON.stringify({ ok: true, data: { id: "1" } }));

    await expect(apiCallOrThrow("/api/users", { method: "GET" })).resolves.toEqual({ id: "1" });
  });

  it("throws an ApiCallError with the error details on failure", async () => {
    respond(JSON.stringify({ ok: false, error: { code: "validation_failed", message: "Invalid", fieldErrors: { name: ["Required"] } } }), 400);

    const error = await apiCallOrThrow("/api/users").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiCallError);
    expect(error).toMatchObject({
      name: "ApiCallError",
      code: "validation_failed",
      message: "Invalid",
      fieldErrors: { name: ["Required"] },
    });
  });
});
