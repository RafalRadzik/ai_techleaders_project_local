import { UserEntity as UserEntityClass } from "./users/user.entity";

/**
 * Process-wide entity classes. Next.js bundles a separate copy of this package into every route
 * and page entry, while `getOrm()` shares one MikroORM instance per process. MikroORM finds entity
 * metadata by class reference (then by class name, which minification mangles differently per
 * copy), so every copy must use the classes the shared ORM was created with.
 */
const registry = { UserEntity: UserEntityClass };
const globalForEntities = globalThis as typeof globalThis & { __devmentorEntities?: typeof registry };
const shared = (globalForEntities.__devmentorEntities ??= registry);

export const UserEntity = shared.UserEntity;
export type UserEntity = UserEntityClass;

/** Every entity must be registered here; folder-based discovery is not used (it breaks under bundlers). */
export const entities = [UserEntity];
