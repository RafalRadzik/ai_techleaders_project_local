// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeContainer } from "@/server/http/http.test-utils";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(() => Promise.resolve()),
  getRequestContainer: vi.fn(),
  check: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/server/container", () => ({ getRequestContainer: mocks.getRequestContainer }));

const { GET } = await import("./route");

const checkedAt = new Date("2026-10-13T10:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRequestContainer.mockReturnValue(fakeContainer({ healthService: { check: mocks.check } }).container);
});

describe("GET /api/health", () => {
  it("answers 200 when everything is up", async () => {
    mocks.check.mockResolvedValue({ status: "up", checkedAt, checks: [{ name: "database", status: "up", latencyMs: 2 }] });

    const response = await GET();

    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "up",
      checkedAt: checkedAt.toISOString(),
      checks: [{ name: "database", status: "up", latencyMs: 2 }],
    });
  });

  it("answers 503 when a check is down and never exposes the error", async () => {
    mocks.check.mockResolvedValue({
      status: "down",
      checkedAt,
      checks: [{ name: "database", status: "down", latencyMs: 5, error: "password authentication failed for user x" }],
    });

    const response = await GET();

    expect(response.status).toBe(503);
    const body = (await response.json()) as { checks: object[] };
    expect(body.checks).toEqual([{ name: "database", status: "down", latencyMs: 5 }]);
  });
});
