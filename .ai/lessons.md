# Lessons Learned

Long-term memory for AI agents working in this repository. **Read this file before starting any task.**

Add an entry whenever you fix a bug, discover a pitfall, find a better approach, or learn something worth remembering.

## How it works

- This file is a concise **index**: one line per lesson, newest first.
- Details live in `.ai/lessons/YYYY-MM-DD-slug.md` (one file per lesson).
- Never delete lessons. If one becomes obsolete, mark it `(obsolete)` in the index and explain why in its file.

## Index format

```
- [YYYY-MM-DD] [slug](lessons/YYYY-MM-DD-slug.md) - one-sentence summary
```

## Lesson file template

```markdown
# <Title>

- **Date:** YYYY-MM-DD
- **Category:** bug | pattern | tooling | performance | process | other
- **Related:** <spec / run / file paths, optional>

## Context
What was being done and what went wrong or was discovered.

## Finding
The root cause or insight.

## Resolution / Recommendation
What fixed it, and what to do (or avoid) next time.
```

## Lessons

<!-- Add new entries below this line, newest first -->
- [2026-10-13] [lockfile-missing-linux-binaries](lessons/2026-10-13-lockfile-missing-linux-binaries.md) - macOS-made lockfile lacked Linux native binaries (npm/cli#4828), so `next build` failed in CI; regenerate the lockfile without `node_modules`
- [2026-10-13] [mikro-orm-entity-identity-across-bundles](lessons/2026-10-13-mikro-orm-entity-identity-across-bundles.md) - Next.js bundles `@devmentor/db` per route while `getOrm()` is process-wide; share entity classes via the `entities/index.ts` registry or prod fails with "Metadata for entity g not found"
- [2026-10-13] [vitest-and-agent-browser-setup](lessons/2026-10-13-vitest-and-agent-browser-setup.md) - Vitest coverage breaks with `--project`; `.mts` configs; mock `server-only`; drop `NODE_ENV` for spawned Next; agent-browser JSON, sessions and Suspense waits
- [2026-10-13] [api-handler-wrapper](lessons/2026-10-13-api-handler-wrapper.md) - Route-handler wrappers: `connection()` outside `try`, resolve the request container once, send `data: null` not `undefined`, wrap option-taking factories for Awilix PROXY
- [2026-10-13] [reconcile-pre-drafted-specs](lessons/2026-10-13-reconcile-pre-drafted-specs.md) - Diff a pre-drafted spec against AGENTS.md and the repo first; ask once, record decisions as an overriding "Reconciliation" table
- [2026-10-13] [root-env-in-monorepo](lessons/2026-10-13-root-env-in-monorepo.md) - Load the root `.env` via `with-root-env` before Next.js starts; `loadEnvConfig`/`loadEnvFile` in `next.config.ts` doesn't reach request handlers
- [2026-10-13] [npm-workspace-bin-linking](lessons/2026-10-13-npm-workspace-bin-linking.md) - After adding a `bin` to a linked workspace package, run `npm rebuild <pkg>`; `npm install` won't link it
