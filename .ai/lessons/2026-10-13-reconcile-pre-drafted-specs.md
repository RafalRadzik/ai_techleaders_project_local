# Reconcile a pre-drafted spec with the repository before implementing it

- **Date:** 2026-10-13
- **Category:** process
- **Related:** `.ai/specs/implemented/2026-09-01-engineering-standards.md`, `.ai/runs/2026-10-13-engineering-standards.md`

## Context

The engineering-standards spec was drafted before the monorepo bootstrap. It described a different repo:

- `core → db` direction and Awilix inside `core`;
- `packages/app/src/app`;
- `export const dynamic = "force-dynamic"` (not available with Cache Components);
- files and pages that don't exist (`admin/users`, `mentor-profile.entity.ts`, `docs/product-scope.md`);
- new dependencies (zod, pino).

Implementing it literally would have broken the lint-enforced package boundaries and the Next.js 16 rules.

## Finding

A spec can be internally consistent and still contradict `AGENTS.md` and the code. AGENTS.md wins (precedence rule), but several conflicts were real design choices, not obvious fixes. Examples: where the HTTP helpers live, the logger dependency, the concept name, and how much API surface to expose without auth.

## Resolution / Recommendation

- Before implementing someone else's spec, diff every path, package direction, API and dependency it mentions against the repo and `AGENTS.md`.
- Ask the owner about the genuine choices in **one** form, with a recommended default for each.
- Record the decisions at the top of the spec as a numbered "Reconciliation" table that explicitly overrides the older sections. Then the spec stays the source of truth without rewriting the whole document.
- Scope the run to the spec's own migration steps and list deferred steps explicitly.
