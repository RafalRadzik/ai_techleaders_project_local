# MikroORM entity classes must be process-wide when the ORM is (Next.js production build)

- **Date:** 2026-10-13
- **Category:** bug
- **Related:** `packages/db/src/entities/index.ts`, `packages/db/src/orm.ts`, `.ai/specs/2026-10-13-ci-and-testing.md`

## Context

The first integration test against `next build` + `next start` failed on `/admin` and `/admin/users`. The browser showed "Minified React error #441" (a Server Component threw), and the server logged `MetadataError: Metadata for entity g not found`. With `next dev` everything worked. Nobody had run the production build against a database before: the build itself never touches the DB because of `await connection()`.

## Finding

- Turbopack gives every route and page entry its own runtime: `.next/server/app/api/health/route.js` starts with `require("[turbopack]_runtime.js")("server/app/api/health/route.js")`. Each entry evaluates its own copy of `@devmentor/db`, so each has a different `UserEntity` class. `@mikro-orm/core` is external, so there is only one copy of it.
- `getOrm()` caches one MikroORM on `globalThis` (one pool per process). The entry that runs first creates it with its own entity classes.
- MikroORM looks metadata up by class reference first and by `class.name` second. In dev the unminified name `UserEntity` matched, so the fallback hid the problem. In production each copy minifies the class differently (`g`, `f`, ...), so both lookups fail.
- A per-module ORM cache (MikroORM's docs pattern) would avoid the mismatch, but it would open one pool per route entry.

## Resolution / Recommendation

- `entities/index.ts` keeps a process-wide registry on `globalThis` (`__devmentorEntities ??= { UserEntity }`) and exports the shared classes. The ORM and every repository then use the same class objects.
- Add new entities to that registry and import entity classes only from `../../entities`, never from the `*.entity.ts` file.
- Verify DB-touching changes with `npm run test:integration`. It runs the production build, and `next dev` won't show bundling or minification bugs.
