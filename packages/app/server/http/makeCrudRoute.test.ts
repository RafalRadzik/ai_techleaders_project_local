// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeContainer, jsonRequest } from "./http.test-utils";

const mocks = vi.hoisted(() => ({ getRequestContainer: vi.fn() }));

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("@/server/container", () => ({ getRequestContainer: mocks.getRequestContainer }));

const { makeCrudRoute } = await import("./makeCrudRoute");

const ID = "0b6f7c1e-1d8a-4c55-9a36-2f1f0d1c9e01";
const schema = z.object({ name: z.string().min(1) });
const service = { kind: "userService" };

const itemContext = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mocks.getRequestContainer.mockReturnValue(fakeContainer({ userService: service }).container);
});

describe("makeCrudRoute", () => {
  it("answers 405 for every unconfigured method", async () => {
    const routes = makeCrudRoute({ service: "userService" });

    for (const response of [
      await routes.GET(jsonRequest("GET"), {}),
      await routes.POST(jsonRequest("POST", {}), {}),
      await routes.PUT(jsonRequest("PUT", {}), itemContext(ID)),
      await routes.DELETE(jsonRequest("DELETE"), itemContext(ID)),
    ]) {
      expect(response.status).toBe(405);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: { code: "method_not_allowed", message: "Method not allowed" },
      });
    }
  });

  describe("with every method configured", () => {
    const list = vi.fn(async () => [{ id: ID }]);
    const create = vi.fn(async (_service: unknown, input: { name: string }) => ({ id: ID, ...input }));
    const update = vi.fn(async (_service: unknown, id: string, input: { name: string }) => ({ id, ...input }));
    const remove = vi.fn(async () => undefined);
    const routes = makeCrudRoute({
      service: "userService",
      list,
      create: { schema, handler: create },
      update: { schema, handler: update },
      remove,
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("lists via GET", async () => {
      const response = await routes.GET(jsonRequest("GET"), {});

      expect(list).toHaveBeenCalledWith(service);
      await expect(response.json()).resolves.toEqual({ ok: true, data: [{ id: ID }] });
    });

    it("creates via POST with the parsed body and 201", async () => {
      const response = await routes.POST(jsonRequest("POST", { name: "Ada", extra: true }), {});

      expect(create).toHaveBeenCalledWith(service, { name: "Ada" });
      expect(response.status).toBe(201);
    });

    it("rejects an invalid POST body", async () => {
      const response = await routes.POST(jsonRequest("POST", { name: "" }), {});

      expect(response.status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    it("updates via PUT with the id and parsed body", async () => {
      const response = await routes.PUT(jsonRequest("PUT", { name: "Grace" }), itemContext(ID));

      expect(update).toHaveBeenCalledWith(service, ID, { name: "Grace" });
      await expect(response.json()).resolves.toEqual({ ok: true, data: { id: ID, name: "Grace" } });
    });

    it("deletes via DELETE", async () => {
      const response = await routes.DELETE(jsonRequest("DELETE"), itemContext(ID));

      expect(remove).toHaveBeenCalledWith(service, ID);
      await expect(response.json()).resolves.toEqual({ ok: true, data: null });
    });

    it.each(["PUT", "DELETE"] as const)("answers 404 for a %s with a non-UUID id", async (method) => {
      const response = await routes[method](jsonRequest(method, { name: "x" }), itemContext("not-a-uuid"));

      expect(response.status).toBe(404);
      expect(update).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });
  });
});
