# CI pipeline, unit tests (100% coverage) and browser integration tests

- **Status:** Implemented
- **Created:** 2026-10-13
- **Runs:** [`2026-10-13-ci-and-testing`](../../runs/2026-10-13-ci-and-testing.md)

## Goal

Every pull request is checked automatically on GitHub: lint, type-check, production build, unit tests with an enforced 100% coverage threshold, and browser-driven integration tests against an ephemeral app + PostgreSQL instance. The repository rules make 100% unit coverage mandatory for every new feature.

## Scope

**In scope**

- GitHub Actions workflow for `pull_request` (and `push` to `main`).
- Unit test framework for all TypeScript workspace packages, with coverage thresholds of 100% (lines, branches, functions, statements).
- Unit tests that bring the existing code to 100% coverage.
- Integration test framework: Testcontainers PostgreSQL, migrated schema, the built app started against it, driven by [`agent-browser`](https://github.com/vercel-labs/agent-browser).
- Integration tests for the home page and the admin panel (dashboard + users screen).
- AGENTS.md / CLAUDE.md / README updates (commands, rules, 100% coverage requirement).

**Out of scope**

- Branch protection settings on GitHub (repository settings, not code) - documented as a follow-up.
- Deployment, release or preview environments.
- Visual regression testing.

## Requirements

1. A workflow `.github/workflows/ci.yml` runs on every pull request with separate, individually reported jobs: `lint`, `typecheck`, `build`, `unit` and `integration`.
2. `npm run test` runs all unit tests; `npm run test:coverage` runs them with coverage and fails below 100% for lines, branches, functions and statements.
3. Unit tests are colocated with the code they test (`<file>.test.ts(x)`), run without a database, network or browser, and respect the package boundaries.
4. Coverage includes every hand-written source file in `shared`, `core`, `db`, `ui` and `app`. Excluded: generated code (MikroORM migrations, shadcn CLI primitives in `ui/src/components/ui`, `next-env.d.ts`), type-only files, barrel `index.ts` re-exports, and the `config` package (tooling presets).
5. `npm run test:integration` starts PostgreSQL 18 with Testcontainers, applies the MikroORM migrations, builds and starts the app (`next start`) against it on a free port, runs the browser tests with `agent-browser`, and tears everything down. It needs only Docker locally.
6. Integration tests cover: the home page renders and links to `/admin`; the admin dashboard shows health `up` and the user count; the users screen lists users, validates input and creates a user that then appears in the table.
7. AGENTS.md states that every new feature or change must ship with unit tests keeping coverage at 100%, and user-facing flows need integration tests. The "no test runner" statements are removed.

## Design notes

- **Unit runner:** Vitest (native ESM + TypeScript, works with source-consumed workspace packages, built-in V8 coverage). One root `vitest.config.ts` with `test.projects` (one per package) and the coverage configuration; each package has its own `vitest.config.ts` (environment `node` for `shared`, `core`, `db`; `jsdom` for `ui`, `app`) and a `test` script.
- **React:** `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` in `ui` and `app`.
- **Next.js specifics in unit tests:** `server-only` aliased to an empty module; `next/server` `connection()`, `next/font/google` and the DI container mocked with `vi.mock`. Async Server Components are tested by awaiting the component function and rendering the result.
- **`db` unit tests:** repositories and the health indicator are tested against a mocked `EntityManager`; real SQL is covered by the integration tests.
- **Integration package:** a new workspace package `packages/integration` (`@devmentor/integration`) with its own `vitest.config.ts`, `globalSetup` (container, migrations, app process) and helpers wrapping the `agent-browser` CLI (`--session` per test file, `--json` output). It imports `@devmentor/db` only to run migrations and seed data. It gets a boundary rule (may not be imported by any other package).
- **CI:** Node 24, `npm ci`, npm cache. The `integration` job runs on `ubuntu-latest` (Docker available for Testcontainers) and installs Chrome via `npx agent-browser install --with-deps`.
- **New dev dependencies:** `vitest`, `@vitest/coverage-v8` (root); `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` (`ui`, `app`); `testcontainers`, `@testcontainers/postgresql`, `agent-browser` (`integration`).

## Implementation notes (deviations and additions)

Approved by the user on 2026-10-13 with all recommended options: Vitest; coverage over all hand-written code, including pages and layouts; a new `packages/integration` workspace; integration tests against the production build.

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Config file names | Root and `app` use `vitest.config.mts` (their `package.json` has no `"type": "module"`). The other packages use `vitest.config.ts`. `shared`/`core`/`db`/`ui`/`integration` tsconfigs include their Vitest config/setup files so that they're type-checked. |
| 2 | Coverage exclusions | Besides the generated code listed in R4: `*.test-utils.ts(x)` test helpers and `vitest.{config,setup}`. Barrels and `next.config.ts` are **tested** rather than excluded, and type-only files report as empty. |
| 3 | Production bug found | The first integration run showed that `/admin` and `/admin/users` failed in the production build (`Metadata for entity g not found`). Cause: each Next.js entry bundles its own copy of `@devmentor/db` while `getOrm()` shares one ORM. Fix: a process-wide entity registry in `packages/db/src/entities/index.ts` (lesson `2026-10-13-mikro-orm-entity-identity-across-bundles`). |
| 4 | Integration package imports | `@devmentor/integration` imports no workspace package (boundary rule `integration`). It runs migrations through `npm run db:migrate` and seeds data through the UI, so the tests only touch the app through the browser. |
| 5 | Migration snapshot | The global setup sets `MIKRO_ORM_MIGRATIONS_SNAPSHOT_ON_MIGRATE=false`, so migrating the ephemeral DB never writes `.snapshot-*.json` files. |
| 6 | Integration knobs | `INTEGRATION_SKIP_BUILD=1` reuses `.next`; `INTEGRATION_DEBUG=1` streams the app output. |

## Acceptance criteria

- [x] `npm run lint`, `npm run typecheck` and `npm run build` pass.
- [x] `npm run test:coverage` passes with 100% lines, branches, functions and statements (175 tests). It exits 1 below 100%, checked with a temporary uncovered file.
- [x] `npm run test:integration` passes locally with Docker (9 browser tests: home page, admin dashboard, admin users).
- [x] `.github/workflows/ci.yml` defines `lint`, `typecheck`, `build`, `unit`, `integration` jobs for pull requests (validated with actionlint; not yet run on GitHub).
- [x] AGENTS.md, CLAUDE.md, packages/app/AGENTS.md and README document the commands and the 100% coverage rule.
