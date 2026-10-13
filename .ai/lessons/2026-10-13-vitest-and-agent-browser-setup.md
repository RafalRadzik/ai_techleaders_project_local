# Vitest monorepo coverage and agent-browser integration tests: pitfalls

- **Date:** 2026-10-13
- **Category:** tooling
- **Related:** `vitest.config.mts`, `packages/*/vitest.config.*`, `packages/integration/src/global-setup.ts`, `packages/integration/src/browser.ts`

## Context

While setting up Vitest 5 with 100% coverage across the workspaces, and browser tests with Testcontainers + agent-browser, I hit several non-obvious issues.

## Finding

- `vitest run --project <name> --coverage` with the root config reports **0 files**. Coverage works only for the full run, or when you run Vitest inside a package.
- A `vitest.config.ts` in a package without `"type": "module"` (the repo root, `packages/app`) makes Vite warn about ESM loaded as CJS. Use `.mts` there.
- `server-only` throws outside the `react-server` condition. `packages/app/vitest.setup.ts` mocks it globally.
- Vitest sets `NODE_ENV=test`. A global setup that spawns `next build` / `next start` must remove it from the child env.
- npm 11 skips agent-browser's postinstall, but the package already ships the native binaries for every platform, so `node node_modules/agent-browser/bin/agent-browser.js` works. Chrome still needs `npx agent-browser install` (`--with-deps` on Linux CI).
- agent-browser `--json` prints `{ success, data, error }` and exits 1 on failure. `--session <id>` isolates browsers between test files.
- Content inside `<Suspense>` streams in after `open` returns. Call `wait --text` before `find ... click`, or the element isn't there yet.
- `mikro-orm migration:up` writes `.snapshot-<dbName>.json` into `packages/db/src/migrations` (`snapshotOnMigrate`). Against the Testcontainers DB that created a stray `.snapshot-test.json`. The global setup sets `MIKRO_ORM_MIGRATIONS_SNAPSHOT_ON_MIGRATE=false`.
- React minifies production errors. #441 means "a Server Component threw"; the real error is in the `next start` output (`INTEGRATION_DEBUG=1`).

## Resolution / Recommendation

Reuse the existing configs and the `Browser` helper. Run coverage for the whole repo. Check every integration test for page and console errors (`collectErrors()` in `afterEach`) so that server-side render failures can't pass silently.
