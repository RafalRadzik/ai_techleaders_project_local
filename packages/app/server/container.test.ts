// @vitest-environment node
import { HealthService, UserService } from "@devmentor/core";
import { DatabaseHealthIndicator, MikroOrmUserRepository } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

const { fakeOrm } = vi.hoisted(() => ({
  fakeOrm: { em: { fork: vi.fn(() => ({ forked: Symbol("em") })) } },
}));

vi.mock("@devmentor/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@devmentor/db")>()),
  getOrm: vi.fn(() => fakeOrm),
}));

const { getRequestContainer } = await import("./container");

describe("getRequestContainer", () => {
  it("resolves every registration from a request scope", () => {
    const container = getRequestContainer();

    expect(container.resolve("orm")).toBe(fakeOrm);
    expect(container.resolve("userRepository")).toBeInstanceOf(MikroOrmUserRepository);
    expect(container.resolve("databaseHealthIndicator")).toBeInstanceOf(DatabaseHealthIndicator);
    expect(container.resolve("healthIndicators")).toEqual([container.resolve("databaseHealthIndicator")]);
    expect(container.resolve("healthService")).toBeInstanceOf(HealthService);
    expect(container.resolve("userService")).toBeInstanceOf(UserService);
    expect(container.resolve("logger")).toEqual(
      expect.objectContaining({ debug: expect.any(Function), info: expect.any(Function), error: expect.any(Function) }),
    );
  });

  it("shares singletons across scopes and forks the EntityManager per scope", () => {
    const first = getRequestContainer();
    const second = getRequestContainer();

    expect(second.resolve("logger")).toBe(first.resolve("logger"));
    expect(second.resolve("orm")).toBe(first.resolve("orm"));
    expect(first.resolve("em")).toBe(first.resolve("em"));
    expect(second.resolve("userService")).toBe(second.resolve("userService"));
    expect(fakeOrm.em.fork).toHaveBeenCalled();
  });
});
