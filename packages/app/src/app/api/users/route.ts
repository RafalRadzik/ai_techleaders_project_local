import { makeCrudRoute, requireRole, requireSession } from '@devmentor/core';

export const dynamic = 'force-dynamic';

/**
 * Reference CRUD route: `route.ts` is configuration, not logic. The collection `GET`
 * list is generated from the service by `makeCrudRoute`; item-level verbs would live in
 * `users/[id]/route.ts` off the same config. There is no `POST`: accounts are created
 * by the sign-in flows, never through this endpoint.
 *
 * Operator only. `authorize` denies before the service is reached (defence in depth);
 * `UserService.list` enforces the same rule itself and is the authority.
 */
export const { GET } = makeCrudRoute({
  resolve: (cradle) => cradle.userService,
  authorize: async (req, cradle) => {
    requireRole(await requireSession(req, cradle), 'operator');
  },
});
