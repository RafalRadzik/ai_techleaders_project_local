# Backward compatibility

What DevMentor treats as a **protected contract surface**, what counts as a breaking change on each, and the path a breaking change must take. Review skills check every PR against this file; implementation skills warn the user when a change does not comply.

DevMentor is pre-1.0 (`0.1.0`), private, and not published to a registry, so most consumers are inside this monorepo. The rules below are scaled to that: in-repo consumers may be updated in the same PR, but anything that reaches outside the repo — the database, HTTP clients, operators' environments — needs the full path.

## Surfaces

### 1. Database schema and migrations (`packages/db/src/migrations/`)

The highest-risk surface: data outlives code.

- **Breaking:** dropping or renaming a table or column, narrowing a type, adding `NOT NULL` without a default/backfill, changing a unique constraint, editing or deleting an already-committed migration or `.snapshot-*.json`.
- **Required path:**
  - Every schema change is a new migration generated with `npm run db:migration:create`, reviewed, and committed with the updated snapshot. Never edit an applied or committed migration.
  - Destructive changes go expand → migrate → contract: add the new shape, backfill and switch code, then drop the old shape in a later PR.
  - The PR is `risk-high`, carries an up-and-down migration test, and states a rollback plan in its body.

### 2. HTTP API (`packages/app/app/api/**/route.ts`)

Current routes: `GET /api/health`, `GET /api/users`, `POST /api/users`.

- **Breaking:**
  - Removing a route or method, or changing its path.
  - Changing the `ApiResult` envelope (`{ ok: true, data }` / `{ ok: false, error: { code, message, fieldErrors? } }`) or the status code mapping of `AppError` subclasses.
  - Removing or renaming a field in `data`, changing its type, or adding a required request field.
  - Changing the error `code` strings (`not_found`, `unauthorized`, `forbidden`, `conflict`, `validation_failed`).
  - Changing the CSRF header contract (`x-devmentor-client: 1`) for state-changing methods.
  - `/api/health`: changing its status-code contract (200 when up, 503 otherwise) or the `name`/`status`/`latencyMs` shape of `checks` — monitoring depends on it.
- **Non-breaking:** adding routes, optional request fields, or response fields.
- **Required path:** prefer additive changes. When a break is unavoidable, update every in-repo caller (`apiCall` users, integration tests) in the same PR, note it in the PR body and `CHANGELOG.md` when one exists, and mark the PR `risk-high`.

### 3. Shared workspace package APIs (`package.json#exports`)

Entry points consumed across packages: `@devmentor/shared`, `@devmentor/core`, `@devmentor/core/validators`, `@devmentor/db`, and the `@devmentor/ui` subpaths (`components/*`, `backend/*`, `backend/api/*`, `lib/*`, `hooks/*`, `globals.css`).

- **Breaking:** removing or renaming an export or an `exports` subpath; changing a function signature, a port interface (`UserRepository`, `HealthIndicator`), a domain type (`User`, `HealthReport`), a Zod schema's accepted shape, or the props of `CrudForm`/`DataTable`/feedback components in an incompatible way.
- **Required path:** all consumers are in this monorepo, so update every importer in the same PR; `npm run typecheck` and `npm run lint` must pass across all workspaces. Changing a shared schema also changes the HTTP contract (surface 2) — apply that path too.

### 4. Environment variables (`.env.example`)

Operators' `.env` files depend on these: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `DATABASE_URL`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`, `DATABASE_POOL_IDLE_TIMEOUT_MS`, `MIKRO_ORM_DEBUG`.

- **Breaking:** renaming or removing a variable, making an optional one required, changing its format or units.
- **Required path:** add the new variable alongside the old one and read both for a transition period, or document the change in `.env.example`, the README env table, and the PR body as a required operator action.

### 5. Root npm scripts (`package.json#scripts`)

`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:coverage`, `test:integration`, `db:*` are used by CI (`.github/workflows/ci.yml`), the agent pipeline (`.ai/agentic.config.json` validation commands), `AGENTS.md`, and the README.

- **Breaking:** removing or renaming a script, or changing what it validates.
- **Required path:** update CI, `.ai/agentic.config.json`, `SDLC.md`, `AGENTS.md`, and the README in the same PR (CI and config changes need user agreement per `AGENTS.md`).

### 6. Public pages and routes (`packages/app/app/`)

Current URLs: `/` (frontend) and `/admin`, `/admin/users` (admin).

- **Breaking:** removing or moving a user-facing URL.
- **Required path:** add a redirect (in `next.config.ts`, with user agreement) or call it out in the PR body; update integration tests.

## Not protected

Internal module layout inside a package (anything not reachable through `exports`), test helpers (`*.test-utils.ts`), generated files, and `.ai/` metadata may change freely, as long as the surfaces above stay intact.
