import { integerEnv, requiredEnv } from "@devmentor/shared";
import { defineConfig, type Options } from "@mikro-orm/postgresql";
import { entities } from "./entities";

type Env = Record<string, string | undefined>;

/** Runtime ORM config shared by the Next.js app and the CLI (which adds the Migrator on top). */
export function createOrmConfig(env: Env = process.env): Options {
  return defineConfig({
    clientUrl: requiredEnv("DATABASE_URL", env),
    entities,
    pool: {
      min: integerEnv("DATABASE_POOL_MIN", 2, env),
      max: integerEnv("DATABASE_POOL_MAX", 10, env),
      idleTimeoutMillis: integerEnv("DATABASE_POOL_IDLE_TIMEOUT_MS", 30_000, env),
    },
    debug: env.MIKRO_ORM_DEBUG === "true",
  });
}
