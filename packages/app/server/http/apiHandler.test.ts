// @vitest-environment node
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@devmentor/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeContainer, jsonRequest } from "./http.test-utils";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(() => Promise.resolve()),
  getRequestContainer: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/server/container", () => ({ getRequestContainer: mocks.getRequestContainer }));

const { apiHandler } = await import("./apiHandler");

let fake: ReturnType<typeof fakeContainer>;

beforeEach(() => {
  vi.clearAllMocks();
  fake = fakeContainer();
  mocks.getRequestContainer.mockReturnValue(fake.container);
});

describe("apiHandler", () => {
  it("opts out of prerendering, passes request, context and container, and wraps the data", async () => {
    const handler = vi.fn().mockResolvedValue({ id: "1" });
    const request = jsonRequest("GET", undefined, { clientHeader: false });
    const context = { params: Promise.resolve({}) };

    const response = await apiHandler(handler)(request, context);

    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ request, context, container: fake.container });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { id: "1" } });
  });

  it("sends data: null when the handler returns nothing", async () => {
    const response = await apiHandler(async () => undefined)(jsonRequest("GET"), {});

    await expect(response.json()).resolves.toEqual({ ok: true, data: null });
  });

  it("uses the configured success status", async () => {
    const response = await apiHandler(async () => ({}), { successStatus: 201 })(jsonRequest("POST", {}), {});

    expect(response.status).toBe(201);
  });

  it.each(["HEAD", "OPTIONS"])("allows the safe method %s without the client header", async (method) => {
    const response = await apiHandler(async () => "ok")(jsonRequest(method, undefined, { clientHeader: false }), {});

    expect(response.status).toBe(200);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("rejects %s without the client header", async (method) => {
    const handler = vi.fn();

    const response = await apiHandler(handler)(jsonRequest(method, {}, { clientHeader: false }), {});

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "forbidden", message: "Missing API client header" },
    });
  });

  it("returns validation errors with their field errors", async () => {
    const response = await apiHandler(async () => {
      throw new ValidationError("Invalid", { email: ["Required"] });
    })(jsonRequest("POST", {}), {});

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "validation_failed", message: "Invalid", fieldErrors: { email: ["Required"] } },
    });
  });

  it.each([
    { error: new UnauthorizedError(), status: 401 },
    { error: new ForbiddenError(), status: 403 },
    { error: new NotFoundError(), status: 404 },
    { error: new ConflictError(), status: 409 },
    { error: new AppError("slot_taken", "That slot is taken"), status: 422 },
  ])("maps $error.name to $status", async ({ error, status }) => {
    const response = await apiHandler(async () => {
      throw error;
    })(jsonRequest("GET"), {});

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ ok: false, error: { code: error.code, message: error.message } });
    expect(fake.logger.error).not.toHaveBeenCalled();
  });

  it("logs unexpected errors and answers with a generic 500", async () => {
    const error = new Error("relation \"users\" does not exist");

    const response = await apiHandler(async () => {
      throw error;
    })(jsonRequest("DELETE"), {});

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "internal_error", message: "Something went wrong. Please try again." },
    });
    expect(fake.logger.error).toHaveBeenCalledWith("Unhandled error in API route", {
      method: "DELETE",
      path: "/api/things",
      error,
    });
  });
});
