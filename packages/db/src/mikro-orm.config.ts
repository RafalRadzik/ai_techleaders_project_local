import { fileURLToPath } from "node:url";
import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/postgresql";
import { createOrmConfig } from "./config";

const migrationsDir = fileURLToPath(new URL("./migrations", import.meta.url));

/**
 * CLI-only config (`npm run db:*`, env loaded by `with-root-env`).
 * The app uses `createOrmConfig()` without the Migrator extension.
 */
export default defineConfig({
  ...createOrmConfig(),
  extensions: [Migrator],
  migrations: {
    path: migrationsDir,
    pathTs: migrationsDir,
  },
});
