# Probe the URL in Next's dev lock, not an assumed port

- **Date:** 2026-10-15
- **Category:** tooling
- **Related:** `.ai/specs/implemented/2026-10-15-idempotent-setup-script.md`, `.ai/runs/2026-10-15-idempotent-setup-script.md`, `packages/config/src/setup/setup.mjs`

## Context
The first version of `npm run setup` checked for a running dev server by probing `http://localhost:${PORT || 3000}`. Code review caught that this could report a healthy server as a stale lock.

## Finding
The port can differ from that assumption in two ways:
- `next dev` moves to the next free port when 3000 is busy.
- `with-root-env` passes `PORT` from the root `.env` to Next, but not to tools that don't load `.env`.

`packages/app/.next/dev/lock` is JSON (`{ pid, port, hostname, appUrl, startedAt }`, written by `setup-dev-bundler.js`). Next deletes it when it exits cleanly, including on SIGINT.

## Resolution / Recommendation
To detect a running dev server, read the lock and probe its `appUrl`. Fall back to `PORT`/3000 only when the lock can't be parsed.
