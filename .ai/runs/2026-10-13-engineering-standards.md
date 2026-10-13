# Implement the engineering standards spec

- **Date:** 2026-10-13
- **Agent:** GitHub Copilot CLI / Claude Opus 5.5
- **Spec:** `.ai/specs/implemented/2026-09-01-engineering-standards.md`
- **Status:** success

## Goal

Apply the engineering standards to the bootstrapped monorepo:

- concept sub-folders,
- a reusable API layer (`apiHandler`, `makeCrudRoute`) and UI layer (`apiCall`, `CrudForm`, `DataTable`, feedback),
- a reference `users` concept (`/api/users`, `/admin/users`),
- updated `AGENTS.md` and `README.md`.

## Plan

1. Reconcile the spec with `AGENTS.md` (R1–R16 in the spec) and get the owner's decisions.
2. Move the `users`/`health` code into concept folders (`git mv`), update imports. Lint + type-check.
3. `shared`: error hierarchy, `ApiResult`, client header constant, console logger with redaction.
4. `core`: `user-create.schema.ts` (zod), `UserService.list/create`, repository port extensions, `@devmentor/core/validators` subpath.
5. `db`: repository `list/create`, map entities to domain objects, unique violation → `ConflictError`.
6. `ui`: move shadcn primitives to `components/ui/`, add table/input/label via the CLI, build `backend/`.
7. `app`: `server/http/{apiHandler,makeCrudRoute}.ts`, `logger` registration, `api/users/route.ts`, `/admin/users` page.
8. Docs: `AGENTS.md`, `packages/app/AGENTS.md`, `README.md`.
9. Verify: lint, type-check, build (no DB), `npm audit`, then the running app with Postgres (`/admin`, `/admin/users`, `/api/health`, `/api/users` error cases).

## Log

- Read `.ai/lessons.md` and both lessons, the prior run log, the spec, all source files, `packages/app/AGENTS.md` and the Next 16 route handler docs (with Cache Components, a GET handler is prerendered unless it hits runtime data → `apiHandler` calls `connection()`).
- Found 16 conflicts between the spec and the repo/AGENTS.md. Asked the owner. Decisions:
  - reconcile (AGENTS.md wins),
  - HTTP helpers in `app/server/http`,
  - zod approved,
  - local logger instead of pino,
  - concept `users`,
  - `/api/users` list + create,
  - defer `auth.ts`,
  - move shadcn primitives to `components/ui/`,
  - don't commit.
- Recorded the decisions as a reconciliation table + acceptance criteria at the top of the spec; status → In progress.
- `git mv`'d `users`/`health` into `core/src/services/<concept>/`, the user entity into `db/src/entities/users/`, and the repository into `db/src/repositories/users/`. Split the `UserRepository` port into `user-repository.port.ts`. The migration and snapshot are untouched (only file paths moved).
- Installed `zod@^4` (4.6.7) in core/app/ui and added `@devmentor/shared` to ui. `npm install` still prints the existing install-scripts warnings (esbuild, fsevents, unrs-resolver).
- `shared`: error subclasses, `ApiResult` envelope, `API_CLIENT_HEADER`, `createConsoleLogger` (JSON lines, key redaction at any depth, depth cap, error `code`).
- `core`: `userCreateSchema` (trim + lowercase email, length limits = column sizes), `UserService.list/create` (early duplicate check + DB unique constraint), client-safe `@devmentor/core/validators` subpath.
- `db`: `list`/`create`, entities mapped to plain `User` objects, `UniqueConstraintViolationException` → `ConflictError`.
- `ui`: moved the shadcn primitives to `components/ui/`, pointed both `components.json` `ui` aliases there, and added `table`, `input`, `label` with the CLI (it installed into the new folder). Built `backend/` with exports `./backend/api/*` (.ts) and `./backend/*` (.tsx).
- `app`: `logger` singleton (wrapped factory, see lesson), `server/http/{apiHandler,makeCrudRoute,parseBody}.ts`, `api/users/route.ts`, `/admin/users` (server page + colocated client `users-panel.tsx`), and a "Manage users" link on `/admin`.
- Runtime check found that the logger dropped the driver error code (`DriverException` has an empty message). Added `code` to the serialized errors.
- A UI screenshot showed red input borders after a successful create. The DOM had no `aria-invalid`; the computed border went from red to neutral within 1s. That was the `transition-colors` fade caught mid-way, not a bug.
- Docs: `AGENTS.md` got the domain concept convention, the reusable API & UI layer, a validation row, the shadcn path, a "Never" rule and a spec-reconciliation rule. Updated `packages/app/AGENTS.md` (layout + route rules, managed blocks untouched), `CLAUDE.md` (one reminder) and `README.md` (domain concepts, API conventions, paths).
- Deleted the 5 test users I created, stopped the dev server and Postgres.

## Changes

- `packages/shared/src/{errors,api-result,logger,index}.ts`: error hierarchy, envelope, CSRF header constant, logger.
- `packages/core/src/services/{users,health}/*`, `validators/**`, `index.ts`, `package.json` (zod, `./validators` export): concept folders, schema, service methods.
- `packages/db/src/entities/users/user.entity.ts` (moved), `repositories/users/user.repository.ts`, `entities/index.ts`, `index.ts`: concept folders, list/create.
- `packages/ui/src/components/ui/*` (moved + input/label/table), `src/backend/**`, `components.json`, `package.json`: primitives folder, panel building blocks.
- `packages/app/server/container.ts`, `server/http/*`, `app/api/users/route.ts`, `app/(admin)/admin/page.tsx`, `app/(admin)/admin/users/*`, `components.json`, `package.json`: reusable API layer + reference users screens.
- `AGENTS.md`, `CLAUDE.md`, `packages/app/AGENTS.md`, `README.md`, `package-lock.json`.

## Verification

- `npm run lint`: clean in every workspace.
- `npm run typecheck`: clean (including `next typegen`).
- `npm run build` with Postgres **stopped**: success. `/admin/users` static, `/admin` partial prerender, `/api/users` and `/api/health` dynamic.
- `npm audit`: the same 10 high findings as the bootstrap (`awilix → fast-glob → micromatch → braces`). Nothing new from zod.
- Dev server + Postgres, with curl:
  - `GET /api/health` → 200.
  - `GET /api/users` → `{"ok":true,"data":[]}`.
  - `POST` without the client header → 403.
  - Invalid JSON → 400.
  - Invalid fields → 400 with `fieldErrors` (`email`, `name`).
  - Valid create with extra `id`/`status` → 201; the email was normalized and the extra fields were ignored.
  - Duplicate → 409.
  - `PUT /api/users` → 405.
  - 5 concurrent identical creates → one 201 and four 409.
  - DB stopped: `/api/users` → generic 500 (error logged server-side with the stack), `/api/health` → 503.
- Headless Chrome (throwaway `playwright-core` in the session folder, not the repo):
  - `/admin` → "Manage users" → `/admin/users` lists the rows.
  - Ctrl+Enter on the empty form shows "Name is required" and "Enter a valid email address".
  - A duplicate email shows the server 409 message.
  - Cmd+Enter with valid data prepends the row and resets the form.
  - Browser console: only the browser's own network log for the expected 409.

## Open issues / next steps

- `/api/users` is unauthenticated (spec R11). The auth spec must add `requireSession`/ownership helpers (R3), JWT/bcrypt/rate limiting and the env schema, and protect `/admin` and `/api/users`.
- `makeCrudRoute` `update`/`remove` (item routes) are type-checked but not exercised yet. The first `[id]` route should verify them.
- Events (`core/src/events`) and validators for other concepts are deferred to the features that need them (spec steps 4–6).
- Step 8 (`docs/product-scope.md` "no DI container" line) is outside this repo. Tell the owner of the training pack.
- There is no test runner. The spec's regression/integration test requirements (e.g. concurrent booking) need a test-setup spec.
- `npm audit` `awilix → braces` findings are still open (same as the bootstrap).

## Lessons recorded

- `.ai/lessons/2026-10-13-reconcile-pre-drafted-specs.md` (also added as a rule in `AGENTS.md` → Specs).
- `.ai/lessons/2026-10-13-api-handler-wrapper.md`.
