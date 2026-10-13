// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeContainer, jsonRequest } from "@/server/http/http.test-utils";

const mocks = vi.hoisted(() => ({ getRequestContainer: vi.fn() }));

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("@/server/container", () => ({ getRequestContainer: mocks.getRequestContainer }));

const routes = await import("./route");

const userService = { list: vi.fn(), create: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRequestContainer.mockReturnValue(fakeContainer({ userService }).container);
});

describe("/api/users", () => {
  it("exports only GET and POST", () => {
    expect(Object.keys(routes).sort()).toEqual(["GET", "POST"]);
  });

  it("lists users", async () => {
    userService.list.mockResolvedValue([{ id: "1" }]);

    const response = await routes.GET(jsonRequest("GET"), {});

    await expect(response.json()).resolves.toEqual({ ok: true, data: [{ id: "1" }] });
  });

  it("creates a user from the normalised shared schema output", async () => {
    userService.create.mockResolvedValue({ id: "1", email: "ada@example.com", name: "Ada" });

    const response = await routes.POST(jsonRequest("POST", { email: " ADA@example.com ", name: " Ada ", id: "x" }), {});

    expect(response.status).toBe(201);
    expect(userService.create).toHaveBeenCalledWith({ email: "ada@example.com", name: "Ada" });
  });

  it("rejects invalid input with field errors", async () => {
    const response = await routes.POST(jsonRequest("POST", { email: "nope", name: "" }), {});

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { fieldErrors: { email: ["Enter a valid email address"], name: ["Name is required"] } },
    });
    expect(userService.create).not.toHaveBeenCalled();
  });
});
