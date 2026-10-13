import { afterEach, describe, expect, it, vi } from "vitest";

const { MikroORM } = vi.hoisted(() => ({
  MikroORM: vi.fn(function (this: { config: unknown }, config: unknown) {
    this.config = config;
  }),
}));

vi.mock("@mikro-orm/postgresql", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mikro-orm/postgresql")>()),
  MikroORM,
}));

const { getOrm } = await import("./orm");

const globalForOrm = globalThis as { __devmentorOrm?: unknown };

afterEach(() => {
  delete globalForOrm.__devmentorOrm;
  vi.unstubAllEnvs();
  MikroORM.mockClear();
});

describe("getOrm", () => {
  it("creates one instance per process from the env config and caches it on globalThis", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/devmentor");

    const first = getOrm();
    const second = getOrm();

    expect(second).toBe(first);
    expect(globalForOrm.__devmentorOrm).toBe(first);
    expect(MikroORM).toHaveBeenCalledTimes(1);
    expect(MikroORM).toHaveBeenCalledWith(
      expect.objectContaining({ clientUrl: "postgresql://user:pass@localhost:5432/devmentor" }),
    );
  });
});
