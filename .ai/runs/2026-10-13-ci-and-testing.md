# CI pipeline, unit tests and browser integration tests

- **Date:** 2026-10-13
- **Agent:** GitHub Copilot CLI / Claude Opus 5.5
- **Spec:** `.ai/specs/implemented/2026-10-13-ci-and-testing.md`
- **Status:** success

## Goal

Add a GitHub Actions CI (lint, typecheck, build, unit, integration), Vitest unit tests with 100% coverage of the existing code, and Testcontainers + agent-browser integration tests for the home page and admin panel.

## Plan

1. Draft the spec and get the decisions approved.
2. Install dev dependencies; add Vitest configs (root + per package) and scripts.
3. Write unit tests package by package until coverage is 100%.
4. Add `packages/integration` (global setup: Testcontainers PostgreSQL, migrations, `next build` + `next start`; agent-browser helpers) and the home/admin tests.
5. Add `.github/workflows/ci.yml`.
6. Update AGENTS.md, CLAUDE.md, README, packages/app/AGENTS.md; record lessons.
7. Verify: lint, typecheck, build, test:coverage, test:integration.

## Log

- Read lessons, AGENTS.md files and all source files. No existing test setup or `.github/`.
- Drafted the spec; asking the user to approve the open decisions.
- User approved all recommended options: Vitest; coverage over all hand-written code incl. pages/layouts; new `packages/integration` workspace; integration against the production build.
- Installed vitest 5, @vitest/coverage-v8 (root), jsdom + Testing Library (ui, app), testcontainers, @testcontainers/postgresql, agent-browser (integration). npm 11 skips agent-browser's postinstall, but the package ships the native binaries, so the CLI works.
- Probed agent-browser: `--json` returns `{ success, data, error }` and exits 1 on failure; `--session <id>` isolates browsers.
- Root `vitest.config.mts` (projects + coverage, threshold 100) and per-package configs. Configs in packages without `"type": "module"` use `.mts` (Vite warns otherwise).
- Quirk: `vitest run --project <name> --coverage` reports 0 files with the root config; run coverage without `--project`.
- Wrote unit tests for shared, core, db (mocked EntityManager; entity hooks via ORM metadata without connecting), ui (apiCall, feedback, CrudForm, DataTable), app (container, apiHandler, makeCrudRoute, parseBody, routes, layouts, pages incl. the async SystemStatus, UsersPanel). Result: 173 tests, 100% statements/branches/functions/lines.
- Test-only helpers use the `*.test-utils.ts` suffix and are excluded from coverage.
- Added `packages/integration`: global setup (Testcontainers `postgres:18-alpine` -> `npm run db:migrate` -> `npm run build` -> `next start` on a free port -> wait for `/api/health`), the `Browser` helper over the agent-browser CLI (one session per file, `--json`, page/console error collection) and the home/admin tests. Added the `integration` boundary rule.
- First integration run: the infrastructure worked, but `/admin` failed with React #441. The server log showed `MetadataError: Metadata for entity g not found`. Root cause: each Turbopack entry has its own runtime and its own copy of `@devmentor/db` (confirmed in `.next/server/app/*/route.js` and the duplicated entity in 3 chunks), while `getOrm()` shares one ORM on `globalThis`. Minified class names differ per copy, so MikroORM's class and name lookups both fail. Dev only worked through the unminified-name fallback.
- Considered: a per-module ORM cache (MikroORM docs) means one pool per route entry, so rejected. Turning off minification isn't possible with Turbopack, and pinning class names relies on the name fallback. Chosen: a process-wide entity registry in `entities/index.ts`, the same pattern as `getOrm()`. Added unit tests for both registry branches.
- Fixed a test race: content inside `<Suspense>` streams in, so the test waits for text before clicking.
- Added `.github/workflows/ci.yml` (Lint, Type-check, Build, Unit tests (100% coverage), Integration tests) and validated it with actionlint 1.7.12.
- Updated AGENTS.md (stack table, tree, commands, new "Testing (mandatory)" section with the 100% rule, entity registry rule, workflow/DoD/never rules, ask-first now covers `vitest.config.*` and workflows), CLAUDE.md, packages/app/AGENTS.md ("Testing this package") and README ("Testing and CI", scripts, packages, entity registry).
- Found that `db:migrate` against the container wrote `packages/db/src/migrations/.snapshot-test.json`. Deleted it and set `MIKRO_ORM_MIGRATIONS_SNAPSHOT_ON_MIGRATE=false` in the integration env. Re-ran the tests: no file was created.

## Changes

- `package.json`, `package-lock.json`: test scripts; dev deps vitest, @vitest/coverage-v8.
- `vitest.config.mts` (root): projects + 100% coverage thresholds.
- `packages/{shared,core,db,ui}/vitest.config.ts`, `packages/app/vitest.config.mts`, `packages/{ui,app}/vitest.setup.ts`: per-package test config; `test` scripts; tsconfig includes.
- `packages/**/*.test.ts(x)`, `packages/app/server/http/http.test-utils.ts`: 34 unit test files (175 tests).
- `packages/db/src/entities/index.ts`: process-wide entity registry (fixes the production `MetadataError`).
- `packages/integration/*`: new workspace package (config, global setup, `Browser` helper, home/admin tests).
- `packages/config/eslint/boundaries.mjs`: `integration` boundary preset.
- `.github/workflows/ci.yml`: PR CI.
- `AGENTS.md`, `CLAUDE.md`, `packages/app/AGENTS.md`, `README.md`: testing rules and commands.
- `.ai/`: spec (implemented), this log, 2 lessons.

## Verification

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm run build`: pass, no warnings.
- `npm run test:coverage`: 34 files / 175 tests pass; 100% statements (344/344), branches (215/215), functions (113/113), lines (334/334). Gate check: a temporary uncovered file made it exit 1.
- `npm run test:integration` (fresh build): 2 files / 9 tests pass. No leftover containers or `next start` processes afterwards.
- `actionlint .github/workflows/ci.yml`: pass.

## Open issues / next steps

- The workflow hasn't run on GitHub yet. Push a branch / open a PR to see the first run.
- Make the five jobs required checks in the branch protection rules for `main` (repository settings).
- Optional: upload agent-browser screenshots as CI artifacts when integration tests fail.

## Lessons recorded

- `2026-10-13-mikro-orm-entity-identity-across-bundles`
- `2026-10-13-vitest-and-agent-browser-setup`
