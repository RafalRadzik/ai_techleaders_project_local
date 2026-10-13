import { fileURLToPath } from "node:url";
import { Migrator } from "@mikro-orm/migrations";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("CLI config (mikro-orm.config.ts)", () => {
  it("extends the runtime config with the Migrator and the migrations folder", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/devmentor");

    const { default: config } = await import("./mikro-orm.config");
    const migrationsDir = fileURLToPath(new URL("./migrations", import.meta.url));

    expect(config.clientUrl).toBe("postgresql://user:pass@localhost:5432/devmentor");
    expect(config.extensions).toEqual([Migrator]);
    expect(config.migrations).toMatchObject({ path: migrationsDir, pathTs: migrationsDir });
  });
});
