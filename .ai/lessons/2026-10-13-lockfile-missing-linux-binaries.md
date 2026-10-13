# The lockfile lacked Linux native binaries, so CI builds failed

- **Date:** 2026-10-13
- **Category:** tooling
- **Related:** `package-lock.json`, `.github/workflows/ci.yml`, PR #2

## Context

The first CI run on GitHub (ubuntu, `npm ci`) failed in `next build` with `Cannot find module '@tailwindcss/oxide-linux-x64-gnu'`. Lint, type-check and unit tests passed. On macOS everything worked.

## Finding

- npm bug [npm/cli#4828](https://github.com/npm/cli/issues/4828): a lockfile that was created or updated with an existing `node_modules` on one platform can list the platform binaries in `optionalDependencies` but have no `node_modules/<binary>` entries for the other platforms. `npm ci` then installs nothing for Linux.
- Missing entries here: `@tailwindcss/oxide-linux-x64-gnu`, `@next/swc-linux-x64-gnu`, `@img/sharp-linux-x64`, `@img/sharp-libvips-linux-x64`, `@unrs/resolver-binding-linux-x64-gnu`. The lockfile on `main` already had the problem; it just never ran on Linux before.
- Neither `npm install --package-lock-only` nor `npm install --package-lock-only --os=linux --cpu=x64 --libc=glibc` adds the missing entries.

## Resolution / Recommendation

- Regenerate the lockfile from scratch without `node_modules`. Copy every `package.json` (root + `packages/*/`) into a temp dir, run `npm install --package-lock-only --ignore-scripts`, compare the versions, copy the lockfile back, and run `npm ci`.
- After a lockfile change, check that the Linux binaries exist:
  `node -e 'const l=require("./package-lock.json").packages;console.log(["@tailwindcss/oxide-linux-x64-gnu","@next/swc-linux-x64-gnu"].map(d=>Object.keys(l).some(p=>p.endsWith("node_modules/"+d))))'` must print `[ true, true ]`. CI catches it otherwise.
