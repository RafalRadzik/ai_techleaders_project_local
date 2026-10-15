# Idempotent `npm run setup` for local development

- **Date:** 2026-10-15
- **Agent:** GitHub Copilot CLI / Claude Opus 5.5 (`om-auto-fix-issue` → `om-auto-write-spec` → `om-auto-implement-spec` → `om-auto-create-pr`)
- **Spec:** `.ai/specs/2026-10-15-idempotent-setup-script.md` (spec PR #6)
- **Issue:** #5
- **Status:** success

Source doc: .ai/specs/2026-10-15-idempotent-setup-script.md

## Goal

Add `npm run setup`: one idempotent, dependency-free Node command that runs preflight → env → install → db → migrate → dev for local development.

## Scope

- New `packages/config/src/setup/{setup,system}.mjs` (+ tests), `packages/config/bin/setup.mjs`, root `setup` script.
- Test wiring: `packages/config/vitest.config.ts`, `test` script, root `vitest.config.mts` (`config` project, coverage include, `*.test.mjs` exclusion). Approved by the maintainer in session (spec A2).
- Docs: `README.md` (Getting started, Scripts), `AGENTS.md` (Commands, First-time setup).

**Non-goals:** installing Node/Docker/Chrome, seeding data, `npx agent-browser install`, CI changes, a `typecheck` script for `packages/config`.

## Implementation Plan

See the spec's Implementation Plan (Phase 1, steps 1–5). The spec file merges via spec PR #6. This branch does not commit it.

## Risks

- `vitest.config.mts` change: approved in session.
- Install-skip uses an mtime heuristic. It does not detect a manually corrupted `node_modules`.

## Log

- The user invoked `/om-fix 5`. #5 is a feature with no root-cause brief, so on the user's choice the run was re-routed to `om-auto-fix-issue` (feature route).
- The user answered the spec's open questions A1–A3 in session (start dev / Vitest project / always migrate).
- A fresh-context review of the spec led to three changes: db skip requires a healthy container; a stale dev lock fails; dev signals are forwarded.
- Implemented steps 1.1–1.5 one commit each. The only fix needed was a missing branch test in `compareVersions`, which got coverage to 100%.

## Progress

PR: #7

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: npm run setup

- [x] 1.1 Test wiring for packages/config — 8a6318e
- [x] 1.2 Setup logic with unit tests — ceff7dc
- [x] 1.3 System adapter with unit tests — a81c5ed
- [x] 1.4 Entry and root script — 1f57b11
- [x] 1.5 Docs — efb9487

- `om-auto-review-pr` (fresh-context reviewer) approved with 1 minor and 2 nits, all fixed in b8a1fca:
  - The dev probe now uses the `appUrl` recorded in the Next dev lock instead of assuming `PORT || 3000`.
  - The `main` test now asserts root resolution.
  - The test count in this log is corrected.
  - A real re-run while dev was up reported `dev server already running at http://localhost:3000`.
  - `npm run test:coverage` (100%) and `npm run lint -w @devmentor/config` pass. Typecheck and build are unaffected: `packages/config` has no typecheck, and the app does not import the setup logic.

## Changes

- `packages/config/src/setup/{setup,system}.mjs` + tests: orchestration and side-effect adapter.
- `packages/config/bin/setup.mjs`, root `package.json#scripts.setup`: entry.
- `packages/config/{vitest.config.ts,package.json}`, `vitest.config.mts`: `config` test project + coverage.
- `README.md`, `AGENTS.md`: docs.

## Verification

- `npx vitest run --project config`: 2 files and 51 tests pass, after the review fix.
- Full gate, in this order: `npm run lint`, `npm run typecheck`, `npm run test:coverage` and `npm run build` all exit 0, with coverage at 100% on every metric.
- Manual checks in the worktree:
  - The first `npm run setup` ran every step: created `.env`, skipped install (fresh `npm ci`), `db:up` brought PostgreSQL to healthy, applied 1 migration and started dev. `/api/health` returned 200.
  - A second run while dev was up exited 0 with env, install, db and dev skipped, and `.env` checksum unchanged.
  - SIGINT to setup forwarded to dev: `✔ dev done (dev server stopped)`, exit 0, and Next removed the lock.
  - A hand-made stale lock with no server failed with `✖ dev failed (stale lock …)`, exit 1.
- Not checked by hand: Node below 22.17 and a stopped Docker daemon (unit-tested), and Windows.

## Open issues / next steps

- Merge spec PR #6 and then this PR. After both are in, move the spec to `.ai/specs/implemented/`; it lives on the spec branch, so it can't move here.

## Lessons recorded

- `2026-10-15-next-dev-lock-records-app-url`
