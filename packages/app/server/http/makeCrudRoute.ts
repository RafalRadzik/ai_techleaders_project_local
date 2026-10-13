import "server-only";

import { NotFoundError, type ApiFailure } from "@devmentor/shared";
import { z } from "zod";
import type { Cradle } from "@/server/container";
import { apiHandler, type RouteHandler } from "./apiHandler";
import { parseBody } from "./parseBody";

/** Routes talk to services only, never to repositories or the EntityManager. */
type ServiceName = Extract<keyof Cradle, `${string}Service`>;

/** Context of an item route (`api/<concept>/[id]/route.ts`). */
interface ItemRouteContext {
  params: Promise<{ id: string }>;
}

// Every entity id is a UUID; anything else can't exist, so it's a 404 rather than a DB error.
const idSchema = z.uuid();

interface CrudRouteConfig<TName extends ServiceName, TCreate extends z.ZodType, TUpdate extends z.ZodType> {
  service: TName;
  /** `GET` on the collection route. */
  list?: (service: Cradle[TName]) => Promise<unknown>;
  /** `POST` on the collection route; responds `201`. */
  create?: {
    schema: TCreate;
    handler: (service: Cradle[TName], input: z.output<TCreate>) => Promise<unknown>;
  };
  /** `PUT` on the item route. */
  update?: {
    schema: TUpdate;
    handler: (service: Cradle[TName], id: string, input: z.output<TUpdate>) => Promise<unknown>;
  };
  /** `DELETE` on the item route. */
  remove?: (service: Cradle[TName], id: string) => Promise<unknown>;
}

interface CrudRoutes {
  GET: RouteHandler<unknown>;
  POST: RouteHandler<unknown>;
  PUT: RouteHandler<ItemRouteContext>;
  DELETE: RouteHandler<ItemRouteContext>;
}

/**
 * Builds route handlers for a plain CRUD resource from shared schemas and service methods.
 * Re-export only the methods you configured: `export const { GET, POST } = makeCrudRoute({...})`.
 * An unconfigured method answers `405`. Workflows that aren't CRUD use `apiHandler` directly.
 */
export function makeCrudRoute<
  TName extends ServiceName,
  TCreate extends z.ZodType = z.ZodNever,
  TUpdate extends z.ZodType = z.ZodNever,
>(config: CrudRouteConfig<TName, TCreate, TUpdate>): CrudRoutes {
  const { service: serviceName, list, create, update, remove } = config;

  return {
    GET: list
      ? apiHandler(({ container }) => list(container.resolve(serviceName)))
      : methodNotAllowed,
    POST: create
      ? apiHandler(
          async ({ request, container }) => create.handler(container.resolve(serviceName), await parseBody(request, create.schema)),
          { successStatus: 201 },
        )
      : methodNotAllowed,
    PUT: update
      ? apiHandler<unknown, ItemRouteContext>(async ({ request, context, container }) => {
          const id = await parseId(context);
          return update.handler(container.resolve(serviceName), id, await parseBody(request, update.schema));
        })
      : methodNotAllowed,
    DELETE: remove
      ? apiHandler<unknown, ItemRouteContext>(async ({ context, container }) =>
          remove(container.resolve(serviceName), await parseId(context)),
        )
      : methodNotAllowed,
  };
}

async function parseId(context: ItemRouteContext): Promise<string> {
  const { id } = await context.params;
  const result = idSchema.safeParse(id);
  if (!result.success) {
    throw new NotFoundError();
  }
  return result.data;
}

async function methodNotAllowed(): Promise<Response> {
  const body: ApiFailure = { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } };
  return Response.json(body, { status: 405 });
}
