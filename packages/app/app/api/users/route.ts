import { userCreateSchema } from "@devmentor/core/validators";
import { makeCrudRoute } from "@/server/http/makeCrudRoute";

// Unauthenticated until the auth spec lands (engineering-standards spec, R11): local development only.
export const { GET, POST } = makeCrudRoute({
  service: "userService",
  list: (users) => users.list(),
  create: { schema: userCreateSchema, handler: (users, input) => users.create(input) },
});
