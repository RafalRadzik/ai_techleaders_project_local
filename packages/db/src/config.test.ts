import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrmConfig } from "./config";
import { entities } from "./entities";

const DATABASE_URL = "postgresql://user:pass@localhost:5432/devmentor";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createOrmConfig", () => {
  it("uses the defaults when only DATABASE_URL is set", () => {
    const config = createOrmConfig({ DATABASE_URL });

    expect(config).toMatchObject({
      clientUrl: DATABASE_URL,
      entities,
      pool: { min: 2, max: 10, idleTimeoutMillis: 30_000 },
      debug: false,
    });
  });

  it("reads pool settings and debug from env", () => {
    const config = createOrmConfig({
      DATABASE_URL,
      DATABASE_POOL_MIN: "1",
      DATABASE_POOL_MAX: "4",
      DATABASE_POOL_IDLE_TIMEOUT_MS: "500",
      MIKRO_ORM_DEBUG: "true",
    });

    expect(config).toMatchObject({ pool: { min: 1, max: 4, idleTimeoutMillis: 500 }, debug: true });
  });

  it("requires DATABASE_URL", () => {
    expect(() => createOrmConfig({})).toThrow("Missing required environment variable: DATABASE_URL");
  });

  it("reads process.env by default", () => {
    vi.stubEnv("DATABASE_URL", DATABASE_URL);

    expect(createOrmConfig().clientUrl).toBe(DATABASE_URL);
  });
});
