/**
 * Client-safe entry point (`@devmentor/core/validators`): shared Zod schemas only,
 * so client components can import them without bundling services.
 */
export { userCreateSchema, type UserCreateInput } from "./users/user-create.schema";
