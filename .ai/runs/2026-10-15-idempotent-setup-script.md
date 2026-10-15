# Idempotent `npm run setup` for local development

- **Date:** 2026-10-15
- **Agent:** GitHub Copilot CLI / Claude Opus 5.5 (`om-auto-fix-issue` → `om-auto-write-spec` → `om-auto-implement-spec` → `om-auto-create-pr`)
- **Spec:** `.ai/specs/2026-10-15-idempotent-setup-script.md` (spec PR #6)
- **Issue:** #5
- **Status:** in progress

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

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: npm run setup

- [ ] 1.1 Test wiring for packages/config
- [ ] 1.2 Setup logic with unit tests
- [ ] 1.3 System adapter with unit tests
- [ ] 1.4 Entry and root script
- [ ] 1.5 Docs

## Verification

## Lessons recorded
