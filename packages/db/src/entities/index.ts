import { UserEntity } from "./user.entity";

export { UserEntity };

/** Every entity must be registered here; folder-based discovery is not used (it breaks under bundlers). */
export const entities = [UserEntity];
