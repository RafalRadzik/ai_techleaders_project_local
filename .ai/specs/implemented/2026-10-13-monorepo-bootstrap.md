# Bootstrap the DevMentor monorepo

- **Status:** Implemented
- **Created:** 2026-10-13
- **Runs:** [2026-10-13-monorepo-bootstrap](../../runs/2026-10-13-monorepo-bootstrap.md)

## Goal

Turn the single create-next-app project into the **DevMentor** npm-workspaces monorepo. Set up the agreed stack: Next.js 16.4 + React 19.3 + TypeScript, PostgreSQL via MikroORM 7 (migrations, connection pooling), Awilix 13 for DI, Tailwind 4 for public pages and shadcn-ui for admin pages. Document all of it in `AGENTS.md` and `README.md` so coding agents follow it.

## Scope

**In scope**

- npm workspaces (`packages/*`), with one root `package-lock.json` and package scope `@devmentor/*`.
- Packages: `app`, `core`, `db`, `ui`, `shared`, `config`.
- Move the existing Next.js app (`app/`, `public/`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`) into `packages/app`.
- One Next.js app with two root layouts:
  - `(frontend)` route group with the public pages (plain Tailwind).
  - `(admin)` route group with the backend pages under `/admin` (shadcn-ui from `@devmentor/ui`).
- MikroORM config, connection pool, an example `User` entity and the initial migration.
- Awilix composition root in `app`, with a request-scoped container.
- Example vertical slice that exercises every layer: `HealthService` (core) → MikroORM adapters (db) → Awilix container → `/admin` dashboard and `GET /api/health`.
- `docker-compose.yml` with PostgreSQL, plus `.env.example`.
- Rewrite `AGENTS.md` (and keep `CLAUDE.md` consistent); rewrite `README.md` with architecture notes.

**Out of scope**

- Auth, real product features, a test runner, CI, deployment, Turborepo, seeders.

## Requirements

1. Root `package.json` declares `"workspaces": ["packages/*"]` and proxy scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `db:up`, `db:down`, `db:migration:create`, `db:migrate`, `db:migration:list`.
2. Workspace packages are consumed **as TypeScript source**. Each `package.json#exports` points at `src/*.ts`, so there is no per-package build step; Turbopack transpiles workspace packages automatically.
3. Dependency direction is enforced (ESLint `no-restricted-imports` where practical):
   - `shared` → nothing internal
   - `core` → `shared` only (no framework, ORM, DI, React or Next.js imports)
   - `db` → `core`, `shared` (implements core ports with MikroORM)
   - `ui` → `shared` (React + shadcn only, no data access)
   - `app` → everything; it is the only composition root and the only package that imports `awilix`
   - `config` → dev-only presets, imported by every package
4. `@devmentor/config` provides `tsconfig/base.json`, `tsconfig/library.json` and `tsconfig/nextjs.json`, plus ESLint flat presets `eslint/base.mjs` and `eslint/next.mjs`.
5. `@devmentor/db`:
   - Entities use `defineEntity` (no decorators or reflect-metadata) and are listed explicitly (no folder discovery), so bundling works.
   - `src/config.ts` is the runtime config: `clientUrl` from `DATABASE_URL`, `pool` from `DATABASE_POOL_MIN` / `DATABASE_POOL_MAX`.
   - `src/mikro-orm.config.ts` is the CLI config. It adds the `Migrator` extension. The CLI uses the `tsx` loader, and env comes from `with-root-env` (see Deviations).
   - `getOrm()` is a lazily initialised singleton cached on `globalThis` (survives HMR, so it doesn't exhaust pool connections).
   - Migrations live in `packages/db/src/migrations`.
6. `@devmentor/app`:
   - `server/container.ts` builds the Awilix container (`InjectionMode.PROXY`, `strict: true`) and marks the module `server-only` (see Deviations).
   - `getRequestContainer()` creates one scope per request (memoised with React `cache`) and registers a forked `EntityManager`.
   - Package scripts load the root `.env` through the `with-root-env` bin from `@devmentor/config` (see Deviations).
7. `@devmentor/ui` follows the shadcn monorepo layout:
   - `components.json` in both `ui` and `app`.
   - Components in `packages/ui/src/components`, `cn` in `src/lib/utils.ts`, theme in `src/styles/globals.css`.
   - Imports look like `@devmentor/ui/components/button`.
8. Admin pages import shadcn styles; public pages import only their own Tailwind CSS.
9. Data access in pages respects Cache Components (wrapped in `<Suspense>`).
10. `.gitignore` allows `.env.example` (template, no secrets). The real `.env` stays ignored.
11. `AGENTS.md` documents the stack, monorepo layout, dependency rules, DI, DB/migration and UI conventions, commands, and the existing `.ai/` workflow. The Next.js-managed blocks move with the Next app to `packages/app/AGENTS.md`, because `next dev` maintains them in its project directory (verified in `next/dist/server/lib/generate-agent-files.js`).
12. `README.md` documents the architecture, getting started, scripts and the env vars.

## Design notes

```
packages/
  app/     @devmentor/app     Next.js app = composition root (Awilix), routes, pages, route handlers
  core/    @devmentor/core    domain types, services, ports (interfaces); framework-free
  db/      @devmentor/db      MikroORM config, entities, repositories/adapters, migrations
  ui/      @devmentor/ui      shadcn-ui components + theme for admin pages
  shared/  @devmentor/shared  framework-free utilities and types shared by all packages
  config/  @devmentor/config  tsconfig + ESLint presets
```

- **DI style:** services are plain classes that receive a dependencies object, `constructor({ userRepository }: Deps)`. This fits Awilix PROXY mode, and `core` stays free of Awilix.
  - Singletons: `orm`, config.
  - Scoped (per request): `em`, repositories, services.
- **MikroORM in Next:** `@mikro-orm/core` and `pg` are already in Next's default `serverExternalPackages`. Other `@mikro-orm/*` packages are added to it if bundling requires that.
- **Env:**
  - A single root `.env` is shared by Next.js and the MikroORM CLI (both via `with-root-env`) and by `docker compose` (which reads the root `.env` automatically).
- **Removed generated leftovers at the root** (all gitignored): `.next/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`.
- **New dependencies (approved by the user, 2026-10-13):**
  - Runtime: `@mikro-orm/core`, `@mikro-orm/postgresql`, `@mikro-orm/migrations`, `awilix`, `server-only`. `@next/env` was dropped, see Deviations.
  - shadcn: shadcn runtime deps as chosen by the shadcn CLI. The actual set is `@base-ui/react`, `class-variance-authority`, `cn`, `lucide-react`, `shadcn`, `tw-animate-css` (`base-nova` style).
  - Dev: `@mikro-orm/cli`, `tsx`, `typescript-eslint`.
- **Assumption:** "Awillix" in the request means the `awilix` package.

## Deviations (recorded during implementation)

1. **Composition root path.** The container lives in `packages/app/server/container.ts`, not `src/server/container.ts`. A root-level `src/` next to `app/` clashes with the Next.js `src` folder convention.
2. **Env loading.**
   - `loadEnvConfig` from `@next/env` in `next.config.ts` doesn't reach request handlers. Next.js caches the first result and resets `process.env` to its start-up snapshot (lesson `2026-10-13-root-env-in-monorepo`).
   - Replaced it with the dependency-free `with-root-env` bin in `@devmentor/config`, used by the app and db scripts. The MikroORM CLI config no longer loads env itself.
   - `@next/env` was removed again.
3. **Health endpoint hardening.**
   - `GET /api/health` omits raw error messages, which can leak hosts or usernames.
   - The admin dashboard shows them.
   - `HealthService` falls back to the error code (e.g. `ECONNREFUSED`) when a driver error has an empty message.
4. **`serverExternalPackages`** needed no changes. MikroORM works bundled as-is: `@mikro-orm/core` and `pg` are externalised by default.

## Acceptance criteria

- [x] `npm install` at the root produces a single lockfile and links all six workspaces.
- [x] `npm run lint` passes with no warnings.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
- [x] `npm run db:up` starts PostgreSQL, `npm run db:migrate` applies the initial migration, and `npm run db:migration:list` shows it.
- [x] `/` renders the public Tailwind page. `/admin` renders the shadcn dashboard with DB health and user count from the DI container. `GET /api/health` returns JSON. No console or server errors.
- [x] `core` has no imports of next, react, awilix, @mikro-orm or other `@devmentor/*` packages except `shared` (lint-enforced).
- [x] `AGENTS.md`, `packages/app/AGENTS.md`, `CLAUDE.md` and `README.md` are updated.
