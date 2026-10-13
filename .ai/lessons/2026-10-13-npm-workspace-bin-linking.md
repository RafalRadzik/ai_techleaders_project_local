# npm doesn't link a bin added to an existing workspace package

- **Date:** 2026-10-13
- **Category:** tooling
- **Related:** `packages/config/package.json` (`bin.with-root-env`)

## Context

I added a `bin` entry to the already-installed workspace package `@devmentor/config` and ran `npm install`. The lockfile was updated, but `node_modules/.bin/with-root-env` was not created, so the scripts failed with "command not found".

## Finding

npm 11 does not re-link bins of a workspace package that is already symlinked when only its `bin` field changes. Fresh installs (`npm ci`, or a new clone) link it correctly because the lockfile records the bin.

## Resolution / Recommendation

After adding or renaming a `bin` in a workspace package, run `npm rebuild @devmentor/<name>` (or reinstall). Then check that `node_modules/.bin/<bin>` exists.
