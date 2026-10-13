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
- [2026-10-13] [root-env-in-monorepo](lessons/2026-10-13-root-env-in-monorepo.md) - Load the root `.env` via `with-root-env` before Next.js starts; `loadEnvConfig`/`loadEnvFile` in `next.config.ts` doesn't reach request handlers
- [2026-10-13] [npm-workspace-bin-linking](lessons/2026-10-13-npm-workspace-bin-linking.md) - After adding a `bin` to a linked workspace package, run `npm rebuild <pkg>`; `npm install` won't link it
