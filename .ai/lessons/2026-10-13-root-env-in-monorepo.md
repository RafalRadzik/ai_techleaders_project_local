# Load the root .env before Next.js starts (with-root-env)

- **Date:** 2026-10-13
- **Category:** tooling
- **Related:** `.ai/specs/implemented/2026-10-13-monorepo-bootstrap.md`, `packages/config/bin/with-root-env.mjs`

## Context

After moving the Next.js app to `packages/app`, the monorepo keeps a single `.env` at the repo root. Next.js, the MikroORM CLI and docker compose all share it. Calling `loadEnvConfig(<repo root>)` from `@next/env` inside `next.config.ts` looked right, and the build passed. At request time, though, `DATABASE_URL` was missing: `/admin` showed nothing and `/api/health` returned a 500.

## Finding

- `@next/env` caches the first `loadEnvConfig` result. Next.js has already called it for `packages/app`, so a second call without `forceReload` returns the cache and loads nothing.
- Whenever Next.js (re)loads env files, it first resets `process.env` to the snapshot taken at process start. Anything added later (e.g. via `process.loadEnvFile` in `next.config.ts`) can disappear.
- Workarounds that do **not** work:
  - `NODE_OPTIONS=--env-file-if-exists=...` (not allowed in `NODE_OPTIONS`).
  - `node --env-file-if-exists=... --run <script>` (the vars are not passed to the script's child process).
- `process.loadEnvFile()` does not override variables that are already set.

## Resolution / Recommendation

- Env vars must be in the process environment **before** Next.js starts. `@devmentor/config` ships a bin, `with-root-env`, that loads the root `.env` (existing vars win) and spawns the command.
- Every package script that needs env uses it (`with-root-env next dev`, `with-root-env mikro-orm migration:up`, ...).
- Don't load env files from `next.config.ts` or from library code.
- Verify env-dependent changes against the running app (`/api/health`), not only the build. The build doesn't touch the DB because of `await connection()`.
