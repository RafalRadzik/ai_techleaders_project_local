# Idempotent `npm run setup` for local development

- **Status:** In progress (implementation PR #7)
- **Created:** 2026-10-15
- **Issue:** #5
- **Runs:** `.ai/runs/2026-10-15-idempotent-setup-script.md` (implementation run)

## 📝 TLDR

A developer cloning DevMentor today runs five commands by hand from `README.md` → *Getting started*. **Proposed:** one command, `npm run setup`, that runs those steps in order. It fails fast when a prerequisite is missing, and on a re-run it skips or harmlessly repeats the steps that are already done, so it can always be run again safely.

## 📝 Problem Statement

First-time setup is `cp .env.example .env && npm install && npm run db:up && npm run db:migrate && npm run dev`. Missing a step (usually `.env` or the migration) gives confusing runtime errors. Re-running the chain by hand is unsafe: `cp` overwrites a customised `.env`. There is no prerequisite check, so a stopped Docker daemon only shows up as a `db:up` failure halfway through.

## 📝 Proposed Solution

A dependency-free Node ES module, run as `node packages/config/bin/setup.mjs` from a new root script `setup`. It has to work **before** `npm install`, so it uses Node built-ins only (no workspace imports, no `tsx`, no `with-root-env` bin link).

Flow: **preflight** → **env** → **install** → **db** → **migrate** → **dev**. Each step prints `✔ <step> done` or `↷ <step> skipped (<reason>)`. The first failing step prints `✖ <step> failed` and the run exits with that step's non-zero code. Re-running resumes, because every earlier step is idempotent.

| Step | Skip / idempotency rule | Action when not skipped |
| --- | --- | --- |
| preflight | never skipped | `process.versions.node` ≥ `22.17.0` (root `engines.node`), then `docker compose version` and `docker info` must exit 0. On failure: a clear message and exit 1 **before any step runs** |
| env | `.env` exists → skipped | copy `.env.example` → `.env` with `COPYFILE_EXCL`, so an existing file is never overwritten, even in a race |
| install | `node_modules/.package-lock.json` exists **and** its mtime ≥ `package-lock.json` mtime → skipped | `npm install` |
| db | `docker compose ps --format json postgres` reports `State: running` **and** `Health: healthy` → skipped ("already healthy"). Parses both NDJSON and array output. Unparseable output counts as not healthy | `npm run db:up` (`docker compose up -d --wait`, waits until healthy) |
| migrate | never skipped; `db:migrate` is a no-op when nothing is pending (A3) | `npm run db:migrate` |
| dev | `packages/app/.next/dev/lock` exists **and** `GET <lock appUrl>/api/health` answers with any HTTP status within 2 s → skipped. `next dev` records its real `appUrl` in the lock; the probe falls back to `http://localhost:${PORT:-3000}` only when the lock can't be parsed ("dev server already running"). Lock present but no answer → fails as a stale lock (see Edge Cases) | `npm run dev` in the foreground, as the last step (A1). Async `spawn` forwards `SIGINT`/`SIGTERM` like `with-root-env.mjs` |

**Alternatives rejected:**
- A shell script: not portable to Windows, and harder to unit-test.
- A TypeScript script run by `tsx`: needs `npm install` first.
- Parsing `migration:pending`: it prints a table and exits 0 whether or not anything is pending, so parsing it would be brittle.

## 📝 Architecture

| Piece | Path | Role |
| --- | --- | --- |
| Setup logic (new) | `packages/config/src/setup/setup.mjs` | Pure orchestration. `compareVersions`, `preflight`, `parseComposePs`, the step table and `async runSetup(system)` take an injected `system` (`run`, `capture`, `runForeground`, `probe`, `exists`, `readText`, `mtimeMs`, `copyFileExclusive`, `log`, `nodeVersion`, `env`, `root`) and resolve to the exit code. Fully unit-tested |
| System adapter (new) | `packages/config/src/setup/system.mjs` | `createSystem(root)`: `spawnSync` wrappers (`stdio: "inherit"` or captured, `shell` on win32), the async foreground `spawn` with signal forwarding, a `fetch` health probe with `AbortSignal.timeout`, and `node:fs` wrappers. Also `main()`, which resolves the repo root and returns `runSetup(createSystem(root))`. Unit-tested with mocked `node:child_process` / `node:fs` / `fetch` |
| Entry (new) | `packages/config/bin/setup.mjs` | One line of glue: `process.exitCode = await main()`. It sits next to `with-root-env.mjs` and, like it, outside the coverage `include`. All logic, including `main`, is in covered `src/` |
| Root script (new) | `package.json#scripts.setup` | `node packages/config/bin/setup.mjs` |
| Test wiring (changed, approved in session, A2) | `packages/config/vitest.config.ts`, `packages/config/package.json` (`test` script), root `vitest.config.mts` | Adds `config` to `projects` and `packages/config/src/**/*.mjs` to coverage `include`. Adds `**/*.test.mjs` to the test-file exclusion |

`packages/config` stays a leaf tooling package. The new files import only `node:*` modules, so the dependency rules in `boundaries.mjs` are unaffected. The script calls the existing root scripts (`db:up`, `db:migrate`, `dev`) and does not duplicate them, so their behaviour stays the single source of truth.

## 📝 Edge Cases & Failure Scenarios

- **Node too old / Docker missing / daemon down:** preflight fails with `✖ preflight failed: <message>`, where the message names the requirement and what to do:
  - `Node.js >= 22.17.0 is required (found vX).`
  - `Docker with the Compose plugin is required. Install Docker Desktop (or docker + docker compose).`
  - `The Docker daemon is not running. Start Docker and re-run \`npm run setup\`.`

  Exit 1. No file is written.
- **`.env.example` missing:** the env step fails with an explicit message. Exit non-zero.
- **`npm install` / `db:up` / `db:migrate` fails:** the child's own output is shown (inherited stdio), followed by `✖ <step> failed (exit N)`. Setup exits with that code. A re-run skips the completed steps and retries from the failed one.
- **Port 5432 taken by another PostgreSQL:** `db:up` fails, and Docker's error is shown verbatim. Setup does not try to work around it.
- **Stale dev lock** (a dev server that crashed and left `packages/app/.next/dev/lock`): the health probe gets no answer, so the dev step fails with exit 1 and `✖ dev failed (stale lock <path>: no server answers at <url>. Delete the lock and re-run)`. Setup never reports success without a running server.
- **PostgreSQL container running but unhealthy or starting:** the db step is not skipped. `db:up` (`--wait`) waits for health or fails, so migrations never run against a database that is not ready.
- **Ctrl+C / SIGTERM during `npm run dev`:** the signal is forwarded to the dev server. Setup then exits 0 with `dev server stopped`, because this is the normal way to end the foreground server, not a failed step. Any other non-zero dev exit is a failure.
- **Install staleness after `git pull`:** a newer `package-lock.json` makes the mtime check fail, so `npm install` runs again.

## 📝 Risks & Impact Review

- **Additive only.** The new `setup` script adds to a surface that `BACKWARD_COMPATIBILITY.md` §5 protects only against renames and removals. No API, schema, env var or route changes.
- **`vitest.config.mts` change** (adds a project and a coverage `include`) was approved by the maintainer in the authoring session, as `AGENTS.md` "Ask first" requires. The 100% thresholds stay as they are. The new logic is covered, not excluded.
- **Reconciliation with `AGENTS.md`:**
  - `packages/config` has no `typecheck` script, and adding JS type-checking would need a new `tsconfig.json` ("Ask first"). It stays out of scope, as for the existing `with-root-env.mjs`.
  - The one-line `bin/setup.mjs` is uncovered glue, as `with-root-env.mjs` is today. All logic it calls is in `src/` with 100% coverage.
- **Reversibility:** delete the `setup` script entry, the five new files (`bin/setup.mjs`, `src/setup/{setup,system}.mjs` and their two tests) and `packages/config/vitest.config.ts`, then revert the `test` script and the `vitest.config.mts` lines. Nothing persists outside the developer's own checkout (`.env`, `node_modules`, the Docker volume, all created by the existing commands).

## Resolved assumptions (autonomous defaults)

The maintainer answered all three in the authoring session, so none needs further confirmation.

| # | Question | Answer | Rationale |
| --- | --- | --- | --- |
| A1 | Start the dev server as the last step, or stop after migrations? | Start `npm run dev` in the foreground. Skipped when `packages/app/.next/dev/lock` exists **and** the server at the lock's `appUrl` answers `/api/health`. A lock with no answering server fails as stale | Matches the README sequence and the issue's "app reachable" done-criterion. A re-run still exits 0 while a server is up |
| A2 | Where do the script's unit tests run? | A new `config` Vitest project, with `packages/config/src/**/*.mjs` in coverage `include` (100% gate, runs in CI) | Keeps the "every change ships with 100%-covered tests" rule without a parallel test runner |
| A3 | How does the migrate step decide to skip? | It never skips: it always runs `npm run db:migrate`, which is a no-op when nothing is pending | `migration:pending` has no machine-readable output (it prints a table and exits 0 either way) |

## 📋 Phasing

Phase 1 only. It is one independently shippable PR: script, tests, wiring and docs.

## 📋 Implementation Plan

### Phase 1 — `npm run setup`

1. **Test wiring.**
   - Add `packages/config/vitest.config.ts` (`defineProject`, name `config`, environment `node`) and a `"test": "vitest run"` script to `packages/config/package.json`.
   - In root `vitest.config.mts`, add `config` to `projects`, add `packages/config/src/**/*.mjs` to `include`, and add `**/*.test.mjs` to `exclude`.
   - Verify: `npm test` still passes.
2. **Setup logic** (`packages/config/src/setup/setup.mjs` + `setup.test.mjs`).
   - Write `compareVersions`, `preflight`, `parseComposePs` and the step table with skip predicates (including the stale-lock failure), plus `runSetup` with ✔/↷/✖ reporting and exit-code propagation.
   - Tests cover every skip and run branch, every preflight failure, failure exit codes and resume behaviour.
   - Add a test asserting that the minimum Node version equals the root `engines.node`.
   - Verify: `npm run test:coverage` passes at 100%.
3. **System adapter** (`system.mjs` + `system.test.mjs`).
   - Write `createSystem(root)` and `main()`: `spawnSync`/`spawn`/`fs` (including `readText` for the dev lock)/`fetch` wrappers, win32 `shell`, `COPYFILE_EXCL`, a missing file returned as `null` mtime, signal forwarding, and the probe timeout.
   - Tests mock `node:child_process`, `node:fs` and `fetch`.
   - Verify: coverage stays at 100%.
4. **Entry + root script.** Add `packages/config/bin/setup.mjs` and `"setup": "node packages/config/bin/setup.mjs"`.
   - Verify by hand on a real checkout: the first run completes, the second run exits 0 with skips while the dev server runs, an existing `.env` is untouched, and a stale lock fails with the delete hint.
   - This is developer tooling, not an app flow, so manual verification replaces a browser integration test.
5. **Docs.**
   - `README.md` *Getting started*: put `npm run setup` first, with the manual commands under "Manual setup (alternative)". Add a *Scripts* table row.
   - `AGENTS.md`: add a Commands table row and update the "First-time setup" line.
   - Verify: `npm run lint`, `npm run typecheck`, `npm run test:coverage` and `npm run build` all pass.

## Acceptance criteria

- [ ] On a fresh clone, `npm run setup` ends with `.env` present, dependencies installed, PostgreSQL healthy, migrations applied and the dev server running (`/api/health` → `200`).
- [ ] A second `npm run setup` exits 0 and reports env, install, db and dev as skipped. An existing `.env` is never overwritten.
- [ ] An orphaned dev lock with no server running fails with a clear stale-lock message. It never reports success.
- [ ] Node < 22.17 or a missing Docker / stopped daemon fails before any step, with a clear message and a non-zero exit.
- [ ] A failing step stops the run with a non-zero exit, and a re-run resumes from that step.
- [ ] The new logic has 100% unit-test coverage in the `config` Vitest project, and `npm run test:coverage` passes.
- [ ] README shows `npm run setup` first and keeps the manual commands under "Manual setup (alternative)". AGENTS.md lists the command.
