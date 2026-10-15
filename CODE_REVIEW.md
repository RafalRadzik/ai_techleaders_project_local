# Code review rules

How changes to the DevMentor monorepo are reviewed. `om-code-review` (and therefore `om-auto-review-pr`) applies this file automatically on top of its built-in checklist; human reviewers use it the same way. Project rules live in `AGENTS.md` and `packages/app/AGENTS.md`; this file turns them into review checks. When they disagree, `AGENTS.md` wins — fix this file.

## Before reading the diff

- The validation gate is green: `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build` (see `SDLC.md`). CI also runs `npm run test:integration`.
- Non-trivial changes link a spec in `.ai/specs/` and add a run log in `.ai/runs/`. A spec that was finished in this PR is moved to `.ai/specs/implemented/` with its acceptance criteria ticked.
- The change matches its spec. Where it differs, the spec was updated first and says why.

## Review priorities

1. **Correctness** — the code does what the spec/issue asks, including error and empty paths.
2. **Security** — no leaked secrets, no unvalidated input reaching services or the ORM, CSRF header enforced, no raw error details in responses.
3. **Contracts** — nothing listed in `BACKWARD_COMPATIBILITY.md` breaks without its required path.
4. **Architecture** — package boundaries and the shared API/UI layers are respected.
5. **Tests** — 100% coverage held honestly; user-facing flows have integration tests.
6. **Quality** — readable, focused on the task, consistent with the surrounding code.

## Repo-specific checks

### Package boundaries

- Dependency direction holds: `shared ← core ← db ← app`, `shared ← ui ← app`; `integration` imports no workspace package. Rules live in `packages/config/eslint/boundaries.mjs` — any edit there or any `eslint-disable` of a boundary rule is a **blocker**.
- `core` imports no `next`, `react`, `awilix`, or `@mikro-orm/*`. `ui` has no data access and no `core`/`db`/`app` imports. Only `app` imports `awilix`.
- Cross-package imports go through public entry points (`@devmentor/core`, `@devmentor/core/validators`, `@devmentor/db`, `@devmentor/ui/...`), never relative paths into another package's `src/`.
- Every new dependency is declared in the `package.json` of the package that imports it and was agreed with the user first.

### Domain code (concept folders)

- New code follows the concept-folder layout (`core/src/services/<concept>/`, `core/src/validators/<concept>/`, `db/src/entities/<concept>/`, `db/src/repositories/<concept>/`, `app/app/api/<concept>/`). No `modules/`, no empty scaffolded folders, no auto-discovery.
- Services take one dependencies object (`constructor({ userRepository }: Deps)`), never import the container, and throw `@devmentor/shared` errors (`NotFoundError`, `ValidationError`, `ConflictError`, …) — never HTTP responses.
- Every new service/repository is one explicit registration in `packages/app/server/container.ts` plus its `Cradle` entry, with the right lifetime: `singleton` only for process-wide resources (`orm`, `logger`), `scoped` for anything touching the `EntityManager`.

### API routes

- Routes use `makeCrudRoute` (plain CRUD) or `apiHandler` (workflows) from `packages/app/server/http/`. A hand-rolled `try/catch` + `Response.json` in a route is a **blocker** (only `/api/health` is exempt).
- Request bodies are parsed through a shared Zod schema from `@devmentor/core/validators` via `parseBody`/`makeCrudRoute`. A raw body passed to a service, `em.create()` or `em.assign()` is a **blocker** (mass assignment).
- Responses use the `ApiResult` envelope (`{ ok: true, data }` / `{ ok: false, error }`). Unexpected errors are logged through the container `logger` and answered with a generic 500 — no stack traces or raw messages.
- New unauthenticated endpoints are called out explicitly; until auth lands they are local-development only.

### Database (MikroORM)

- Entities use `defineEntity` + `p` with the class pattern — no decorators, no `reflect-metadata` — and are registered in `packages/db/src/entities/index.ts`; entity classes are imported only from that registry.
- Every schema change ships a new migration plus the updated `.snapshot-*.json`. Editing an existing migration is a **blocker**.
- Request code uses the request-scoped forked `em` from the container. Use of the global `orm.em` in request code is a **blocker**.
- Repositories map entities to plain domain types from `core`.

### UI

- `(frontend)/` pages use Tailwind utilities only and never import `@devmentor/ui`. `(admin)/admin/` pages use shadcn components from `@devmentor/ui`.
- Admin data access goes through `apiCall`/`apiCallOrThrow`; forms use `CrudForm` with the same schema as the route; lists use `DataTable`; loading/error/empty states use `LoadingMessage`/`ErrorMessage`/`EmptyState`. A direct `fetch('/api/...')` is a **blocker**.
- shadcn primitives are added via the CLI into `packages/ui/src/components/ui/`; new reusable components land at the level `AGENTS.md` prescribes (primitive → backend pattern → concept → colocated).

### Next.js 16

- Server Components by default; `"use client"` only on the smallest component that needs it.
- Request-time data and DB reads are wrapped in `<Suspense>` with `await connection()` (or cached with `"use cache"` + `cacheLife`/`cacheTag`). No `dynamic`/`revalidate`/`fetchCache` segment options.
- Request APIs are awaited (`await params`, `await cookies()`); routes are typed with `PageProps`/`LayoutProps`/`RouteContext`. Middleware lives in `proxy.ts`.

### Environment and secrets

- Env vars are read only in server code via `requiredEnv`/`integerEnv`; client code reads only `NEXT_PUBLIC_*`.
- Every new variable is added to `.env.example` (placeholder values) and the README env table. A committed `.env` or real secret is a **blocker**.
- No `console.*` in server code; logging goes through the container `logger`, which redacts sensitive keys.

### Tests

- New/changed code has colocated `*.test.ts(x)` Vitest tests; server-only tests carry `// @vitest-environment node`. Ports, the `EntityManager`, `next/server`, `next/font` and the container are mocked — no real DB, network or browser in unit tests.
- Any of these is a **blocker**: `.skip`/`.only`, `/* v8 ignore */`, new coverage exclusions for hand-written code, lowered thresholds in `vitest.config.mts`, `@ts-ignore`, `any` used to silence the type checker, disabled lint rules.
- New pages, forms and API workflows have integration tests in `packages/integration/src/*.test.ts` using the `Browser` helper; they wait for streamed content and assert no page errors.
- A new package with source code is wired into the root `vitest.config.mts` projects and coverage `include`.

### Config and process files

- Changes to `next.config.ts`, any `tsconfig.json`, `eslint.config.mjs`, `vitest.config.*`, `@devmentor/config` presets, `docker-compose.yml` or `.github/workflows/` need explicit user agreement noted in the PR.
- The `<!-- BEGIN:nextjs-... -->` blocks in `packages/app/AGENTS.md` are not hand-edited.
- Commits follow Conventional Commits and carry the `.ai/` updates with the code they describe.

## Severity guidance

| Severity | Meaning | Verdict |
|---|---|---|
| **Blocker** | Breaks correctness, security, a boundary, a protected contract, the coverage gate, or a rule marked blocker above | Request changes |
| **Major** | Likely bug, missing test for a real path, wrong layer or lifetime, missing migration/spec/run log | Request changes |
| **Minor** | Naming, small duplication, unclear code that works | Approve; may become a follow-up issue |
| **Nit** | Style preference the linter doesn't enforce | Approve; optional |

A `risk-high` PR (auth, sessions, data scoping, money, migrations, shared contracts) must carry the evidence `SDLC.md` lists for its area; without it the review blocks unless a maintainer waives it on the PR.
