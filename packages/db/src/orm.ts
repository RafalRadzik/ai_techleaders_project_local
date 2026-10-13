import { MikroORM } from "@mikro-orm/postgresql";
import { createOrmConfig } from "./config";

const globalForOrm = globalThis as typeof globalThis & { __devmentorOrm?: MikroORM };

/**
 * Process-wide MikroORM instance (owns the connection pool).
 * Cached on `globalThis` so Next.js hot reloads don't open a new pool on every change.
 * Never use `orm.em` directly in request code - fork it per request (see @devmentor/app container).
 */
export function getOrm(): MikroORM {
  globalForOrm.__devmentorOrm ??= new MikroORM(createOrmConfig());
  return globalForOrm.__devmentorOrm;
}
