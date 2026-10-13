# Bootstrap the DevMentor monorepo

- **Date:** 2026-10-13
- **Agent:** GitHub Copilot CLI / Claude Opus 5.5
- **Spec:** `.ai/specs/implemented/2026-10-13-monorepo-bootstrap.md`
- **Status:** success

## Goal

Convert the create-next-app project into the DevMentor npm-workspaces monorepo:

- Packages: `app`, `core`, `db`, `ui`, `shared`, `config`.
- Stack: MikroORM 7 + PostgreSQL, Awilix 13, Tailwind 4 + shadcn-ui.
- Update `AGENTS.md` and `README.md` to document it.

## Plan

1. Scaffold the root workspace and the `config` package (tsconfig + ESLint presets).
2. `git mv` the Next app into `packages/app`. Split it into `(frontend)` and `(admin)` root layouts.
3. Create `shared` and `core` (ports + `HealthService`).
4. Create `db`:
   - MikroORM runtime config and CLI config.
   - `User` entity, ORM singleton and adapters.
   - docker-compose and `.env.example`.
5. Create `ui` from the shadcn monorepo template output and add the button, card and badge components.
6. Wire Awilix in `app`. Add the admin dashboard and `/api/health`.
7. Install, lint, type-check, build. Start Postgres, create and apply the initial migration, check the pages in the running app.
8. Update `AGENTS.md`, `packages/app/AGENTS.md`, `CLAUDE.md`, `README.md`. Record lessons and close the spec.

## Log

- Read `.ai/lessons.md` (empty) and the version-matched Next docs:
  - `serverExternalPackages`, `transpilePackages`
  - `turbopack.root`
  - multiple root layouts
  - `@next/env`
  - `server-only`
  - agent rules
- Asked the user about layout and tooling. The user chose:
  - packages `core`, `db`, `ui`, `shared`, `config` (+ `app`)
  - scope `@devmentor`
  - npm workspaces only
  - route groups in one app
  - docker-compose
  - dependency and config changes approved
- Spec drafted and approved by the user. User allowed starting Docker Desktop for verification.

- Started Docker Desktop. Generated a reference `shadcn init --monorepo` scaffold in the session folder (not committed) and mirrored its `ui` layout. Default style is `base-nova` (Base UI + the `cn` package).
- `git mv`'d the Next app, `public/`, `next.config.ts`, `eslint.config.mjs` and `tsconfig.json` into `packages/app`. Deleted the root generated leftovers (`.next/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, all git-ignored).
- Regenerated `package-lock.json` from scratch, because the structure changed completely. `next`, `react` and `react-dom` stay pinned at 16.4.0 / 19.3.0.
- `npm audit` reports 10 high findings. All trace to `braces` via `awilix` → `fast-glob` → `micromatch`. The only fix is `--force` (breaking), so I didn't apply it. We don't use `loadModules` with untrusted globs.
- Created `config`, `shared`, `core` and `db`. Lint and type-check were green.
- Ran `db:up`, then `db:migration:create -- --initial` (`Migration20261013142929`, `users` table), then `db:migrate`.
- Added button, card and badge with `npx shadcn@latest add` from `packages/app`. The CLI installed them into `packages/ui` correctly.
- Moved the composition root to `packages/app/server/` (not `src/server/`) to avoid the Next `src`-folder convention clash. Updated the spec.
- Dev check failed: `DATABASE_URL` missing at request time. Root cause: `@next/env` caching and the `process.env` snapshot reset. `NODE_OPTIONS` and `node --run` workarounds failed. Fixed with the `with-root-env` bin. Lesson recorded.
- `npm install` didn't link the new workspace bin; `npm rebuild @devmentor/config` did. Lesson recorded.
- Hardened health: no raw errors in the public API, an error-code fallback, and errors shown on the admin page.
- Rewrote `AGENTS.md`. Moved the Next-managed blocks verbatim into `packages/app/AGENTS.md`; `hasCurrentAgentRules` and `hasCurrentAgentFeedback` return true there. Added `packages/app/CLAUDE.md`, updated `CLAUDE.md` and rewrote `README.md`.
- Follow-up in the same session. The user asked to finish the remaining work and chose: commit, bump `@types/node`, stop the dev server and Postgres.
- Bumped `@types/node` from `^20` to `^22` (root `devDependencies`) to match `engines.node >= 22.17`.
- Re-ran lint, type-check and build: all green. Smoke-tested the dev server: `/` 200, `/admin` 200, `/api/health` 200 with the DB up and 503 with the DB down.
- Stopped the dev server and ran `npm run db:down`. The `postgres-data` volume is kept.

## Changes

- **Root**
  - `package.json`: workspaces and proxy scripts.
  - `package-lock.json`: regenerated.
  - `.gitignore`: nested `node_modules` / `.next`, `dist`, allow `.env.example`.
  - New: `docker-compose.yml`, `.env.example`.
  - Rewritten: `AGENTS.md`, `CLAUDE.md`, `README.md`.
- **`packages/config`**
  - tsconfig presets (base, library, react-library, nextjs).
  - ESLint presets (base, next, boundaries).
  - `bin/with-root-env.mjs`.
- **`packages/shared`**: `requiredEnv`, `integerEnv`, `AppError`, `assertNever`.
- **`packages/core`**: `HealthService` + `HealthIndicator` port; `UserService` + `UserRepository` port.
- **`packages/db`**
  - Runtime config and `getOrm()` singleton (sync `new MikroORM`).
  - `UserEntity` (`defineEntity`), `MikroOrmUserRepository`, `DatabaseHealthIndicator`.
  - CLI config with the Migrator; initial migration and snapshot.
- **`packages/ui`**: shadcn `components.json`, theme `globals.css`, `cn` util, button, card, badge.
- **`packages/app`**
  - Moved app files.
  - Route groups: `(frontend)` with layout, page and globals.css; `(admin)` with layout, admin.css and `admin/page.tsx`.
  - `app/api/health/route.ts`, `server/container.ts`.
  - `components.json`, `AGENTS.md`, `CLAUDE.md`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`.
- **`.ai`**: this run log, the spec (now in `implemented/`), two lessons, index entries.

## Verification

- **Lint:** `npm run lint` passed in all 6 workspaces, no warnings.
- **Boundary rules:** a temporary probe file in `core` importing `@devmentor/db`, `awilix` and `@mikro-orm/core` produced 3 `no-restricted-imports` errors. The probe was removed.
- **Type-check:** `npm run typecheck` passed (includes `next typegen`).
- **Build:** `npm run build` passed with routes `/` (static), `/admin` (partial prerender), `/api/health` (dynamic).
- **DB scripts:** `npm run db:up`, `db:migrate` and `db:migration:list` work; `\d users` matches the entity.
- **Dev server:**
  - `/` returns 200.
  - `/admin` returns 200 and shows database `up` and users `0`.
  - `/api/health` returns 200 `{"status":"up"}`.
- **DB stopped:**
  - `/api/health` returns 503 without error details.
  - `/admin` shows `ECONNREFUSED`, `down` and `—`.
  - After `db:up` everything recovers to 200 without a restart.
- **CSS isolation:**
  - The admin CSS contains shadcn tokens and component classes.
  - The public CSS contains no shadcn theme.
- **Browser and server errors:** `/_next/mcp` `get_errors` returned none after opening `/` and `/admin` in the browser. The dev server log is clean.
- **Production server:** `next start` on :3001 serves `/`, `/admin` and `/api/health` with 200.

## Open issues / next steps

- The `braces` advisory via `awilix` → `fast-glob` has no non-breaking fix. Watch for an awilix update.
- No test runner yet. Propose Vitest for `core`/`shared`/`db` in a follow-up spec.
- Not set up yet: authentication for `/admin`, CI, deployment, seeders.
- The dev server and the Postgres container are stopped. Run `npm run db:up && npm run dev` to start them again.

## Lessons recorded

- `.ai/lessons/2026-10-13-root-env-in-monorepo.md`
- `.ai/lessons/2026-10-13-npm-workspace-bin-linking.md`
