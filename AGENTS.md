# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, GitHub Copilot, Cursor, etc.) working in the **DevMentor** monorepo. `CLAUDE.md` imports this file, so this file is the single source of truth for the whole repository. `packages/app/AGENTS.md` adds Next.js-specific rules for the app package. Read it too before touching `packages/app`.

**Precedence:** the user's explicit instructions in the current session > this file (and the nested `AGENTS.md` of the package you work in) > `.ai/lessons.md` > your own defaults. If two of these conflict, follow the higher one and say that there was a conflict.

## Project

DevMentor is a Next.js application organised as an **npm-workspaces monorepo**.

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Turbopack, Cache Components), React 19.3 |
| Language | TypeScript 5, `strict` + `noUncheckedIndexedAccess` |
| Database | PostgreSQL 18 (local: `docker-compose.yml`) |
| ORM | MikroORM 7 (`@mikro-orm/postgresql`): migrations, pooled connections, `defineEntity` (no decorators) |
| Dependency injection | Awilix 13 (`InjectionMode.PROXY`, `strict: true`) |
| Public (frontend) pages | Tailwind CSS 4 utility classes |
| Admin (backend) pages | shadcn-ui (`base-nova` style, Base UI primitives) from `@devmentor/ui`, on Tailwind 4 |
| Validation | Zod 4: one schema per input in `@devmentor/core/validators`, used by route handlers and forms |
| Lint | ESLint 9 flat config, shared presets in `@devmentor/config` |
| Package manager | npm workspaces. One root `package-lock.json`. Don't add yarn, pnpm, bun or Turborepo. |

```
.
├── packages/
│   ├── app/      @devmentor/app     Next.js app: routes, pages, route handlers; the ONLY DI composition root
│   ├── core/     @devmentor/core    domain models, services, ports (interfaces); framework-, ORM- and DI-free
│   ├── db/       @devmentor/db      MikroORM config, entities, repository/port adapters, migrations
│   ├── ui/       @devmentor/ui      shadcn-ui components + theme (admin pages only)
│   ├── shared/   @devmentor/shared  framework-free utilities and types (env helpers, errors, ...)
│   └── config/   @devmentor/config  tsconfig presets, ESLint presets, `with-root-env` script
├── .ai/                             AI metadata: specs, run logs, lessons (see below)
├── docker-compose.yml               local PostgreSQL
├── .env.example                     template for the single root `.env`
└── package.json                     workspace root + proxy scripts
```

## Commands

Run everything from the repository root.

| Purpose | Command |
| --- | --- |
| Install dependencies (all workspaces) | `npm install` |
| Start local PostgreSQL / stop it | `npm run db:up` / `npm run db:down` |
| Apply migrations | `npm run db:migrate` |
| Create a migration from entity changes | `npm run db:migration:create` (first one: `-- --initial`) |
| List migrations / roll back one | `npm run db:migration:list` / `npm run db:migrate:down` |
| Dev server (http://localhost:3000) | `npm run dev` |
| Lint (all workspaces) | `npm run lint` |
| Type-check (all workspaces, incl. `next typegen`) | `npm run typecheck` |
| Production build / start | `npm run build` / `npm run start` |
| Add a dependency to one package | `npm install <pkg> -w @devmentor/<name>` |
| Add a shadcn component | `cd packages/app && npx shadcn@latest add <component>` |

- There is no test runner yet. Never say tests pass. Verify with lint, type-check, build, and the running app for UI changes. If a spec needs automated tests, propose a test setup in the spec first.
- Before starting `npm run dev`, check `packages/app/.next/dev/lock`. If a dev server is already running, use it instead of starting another one.
- With the dev server running, `/_next/mcp` (tool `get_errors`) reports browser and server errors.
- First-time setup: `cp .env.example .env && npm install && npm run db:up && npm run db:migrate && npm run dev`.

## Architecture rules

### Dependency rules (lint-enforced)

```
shared  <-  core  <-  db  <-  app
shared  <-  ui  <-----------  app
```

- `shared`: no workspace dependencies, no framework, ORM or DI imports.
- `core`: may import only `@devmentor/shared`. No `next`, `react`, `awilix` or `@mikro-orm/*`. Business logic and **ports** (interfaces such as `UserRepository` and `HealthIndicator`) live here.
- `db`: implements `core` ports with MikroORM. No `next`, `react`, `awilix`, `@devmentor/app` or `@devmentor/ui`.
- `ui`: presentational React + shadcn only. No data access, no `core`, `db` or `app`.
- `app`: integrates everything and is the only package that imports `awilix`.
- The rules live in `packages/config/eslint/boundaries.mjs`. Never disable them. If a rule blocks you, the code is in the wrong package.

### Workspace packages

- Packages are consumed **as TypeScript source**: `package.json#exports` points at `src/**/*.ts(x)`. There is no build step, and Turbopack transpiles workspace packages automatically.
- Import other packages only through their public entry points (`@devmentor/core`, `@devmentor/db`, `@devmentor/ui/components/button`, ...). Never use relative paths across packages (`../../core/src/...`).
- Every package has `lint` and `typecheck` scripts, a `tsconfig.json` extending `@devmentor/config/tsconfig/*`, and an `eslint.config.mjs` built from `@devmentor/config/eslint/*`.
- New package: create `packages/<name>` with `"name": "@devmentor/<name>"` and the same scripts and presets. Add its boundary rule to `boundaries.mjs`, then document it here and in `README.md`. Adding a package needs a spec.
- Declare every dependency in the `package.json` of the package that imports it (not only at the root). Shared tooling (`eslint`, `typescript`, `@types/node`) lives in the root `devDependencies`.

### Domain concept convention

Domain code is not organised into `modules/`. Each concept (`users`, later `auth`, `mentors`, `availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, ...) is a same-named sub-folder repeated across the layers that need it:

| Layer | Path | Example |
| --- | --- | --- |
| Domain type + service | `packages/core/src/services/<concept>/<name>.service.ts` (type in `<name>.ts`) | `services/users/user.service.ts` → `UserService` |
| Port (interface) | `packages/core/src/services/<concept>/<name>.port.ts` | `user-repository.port.ts` → `UserRepository` |
| Shared Zod schema | `packages/core/src/validators/<concept>/<name>-<action>.schema.ts`, re-exported from `validators/index.ts` | `userCreateSchema` |
| Entity | `packages/db/src/entities/<concept>/<name>.entity.ts`, registered in `entities/index.ts` | `entities/users/user.entity.ts` |
| Repository (port adapter) | `packages/db/src/repositories/<concept>/<name>.repository.ts`; maps entities to plain domain objects | `MikroOrmUserRepository` |
| HTTP | `packages/app/app/api/<concept>/route.ts`, item routes in `api/<concept>/[id]/route.ts` | `api/users/route.ts` |
| Concept UI component | `packages/ui/src/components/<concept>/` | — |

- Create a concept folder only when its first file is added. Never scaffold empty ones, and never add a per-concept setup/ACL file or auto-discovery.
- Every new service or repository is one explicit line in `container.ts` (and its `Cradle` entry). No `loadModules`.
- Domain errors are the `@devmentor/shared` classes (`NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`, `ConflictError`, base `AppError`). Services throw them and never build HTTP responses.
- Domain events (`concept.entity.action`, e.g. `bookings.booking.created`) will use a typed in-process emitter in `packages/core/src/events`, added with the first feature that emits one. There is no queue.
- External integrations (payments, notifications) are ports in `core` with a mock adapter first. Vendor SDKs never reach `core`.
- Full naming table, principles and security requirements: `.ai/specs/implemented/2026-09-01-engineering-standards.md` (its "Reconciliation" table overrides the older sections).

### Reusable API & UI layer

Every route and page reuses these instead of re-implementing fetch, validation or error handling:

- `packages/app/server/http/` (server-only):
  - `apiHandler.ts` wraps a route handler. It calls `connection()`, rejects state-changing requests without the `x-devmentor-client` header (CSRF), returns `{ ok: true, data }`, maps `AppError`s to `{ ok: false, error: { code, message, fieldErrors? } }` with the right status, and logs unexpected errors (generic `500`, nothing leaked).
  - `makeCrudRoute.ts` turns a service name + shared schemas into `{ GET, POST, PUT, DELETE }` for plain CRUD: `export const { GET, POST } = makeCrudRoute({ service: "userService", list, create })`. Use `apiHandler` directly for workflows (booking, payment).
  - `parseBody.ts` parses JSON through a schema. Services only ever get the parsed output (no mass assignment).
  - Route handlers never write their own `try/catch` + `Response.json`. Exception: `/api/health`, a monitoring probe whose contract is the status code.
- `packages/ui/src/backend/` (admin):
  - `api/apiCall.ts`: `apiCall` / `apiCallOrThrow`, the only `fetch()` call site for `/api/*`.
  - `forms/CrudForm.tsx`: schema-driven form (same schema as the route), server `fieldErrors`, Cmd/Ctrl+Enter submit, Escape cancel.
  - `tables/DataTable.tsx`: column config, loading/empty/error states, pagination, row actions.
  - `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`: the only loading/error/empty renderers.
- The envelope types (`ApiResult`) and the client header constant live in `@devmentor/shared`, so `app` and `ui` share them.
- Logging: resolve `logger` from the container (`createConsoleLogger` from `@devmentor/shared`, which redacts passwords, tokens, cookies and secrets). No `console.*` in server code.
- Where a new reusable component goes:
  1. shadcn primitive → `ui/src/components/ui/`, only via the shadcn CLI.
  2. Generic panel pattern → `ui/src/backend/<category>/`.
  3. Tied to one concept's domain shape → `ui/src/components/<concept>/`.
  4. Used by one page → colocate it next to that `page.tsx` until a second page needs it (e.g. `admin/users/users-panel.tsx`).
- Reference implementation to copy: `api/users/route.ts` + `(admin)/admin/users/`.

### Dependency injection (Awilix)

- The composition root is `packages/app/server/container.ts`. It is `server-only` and is the only place that registers dependencies. Add each registration to the `Cradle` interface first.
- Services are plain classes or factories that take **one dependencies object**: `constructor({ userRepository }: Deps)` (PROXY injection mode). Never import the container from services, and never use the service-locator pattern outside `app`.
- Lifetimes:
  - `singleton`: process-wide resources, e.g. `orm`, which owns the connection pool, and the stateless `logger`.
  - `scoped`: everything that touches the `EntityManager`, plus services.
  - Strict mode rejects a singleton that depends on something scoped.
- Use `getRequestContainer()` to get the request scope. In Server Components it is memoised per request with React `cache`. In Route Handlers and Server Actions, call it once and reuse the result (`apiHandler` does this and passes `container` to your handler).

### Database (MikroORM + PostgreSQL)

- Configuration lives in `packages/db/src/config.ts` (`createOrmConfig`). Connection and pool settings come from env: `DATABASE_URL`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`, `DATABASE_POOL_IDLE_TIMEOUT_MS`.
- The CLI config is `packages/db/src/mikro-orm.config.ts`. It adds the `Migrator`, uses the `tsx` loader, and keeps migrations in `packages/db/src/migrations`.
- `getOrm()` returns one `MikroORM` instance per process, cached on `globalThis` so HMR doesn't leak pools. **Never use the global `orm.em` in request code.** Always use the request-scoped forked `em` from the container.
- Entities:
  - Use `defineEntity` + `p` and the class pattern (`class XEntity extends XSchema.class {}` + `setClass`). No decorators, no `reflect-metadata`.
  - Register every entity in `packages/db/src/entities/index.ts`. Folder-based discovery is not used.
- Every schema change ships as a migration:
  1. Change the entity.
  2. Run `npm run db:migration:create`.
  3. Review the generated SQL.
  4. Run `npm run db:migrate`.
  5. Commit the migration together with `.snapshot-*.json`.
  - Never edit a migration that has been applied or committed; add a new one. Never use `schema:update` against shared databases.
- `core` defines domain types and repository interfaces. `db` repositories implement them and may return entities only where they structurally satisfy the domain type.

### UI: frontend vs admin

- `packages/app/app` uses **two root layouts** (route groups):
  - `(frontend)/` holds the public pages. They use Tailwind utility classes and `(frontend)/globals.css` only. Don't import `@devmentor/ui` here.
  - `(admin)/admin/` holds the backend pages under `/admin`. They use shadcn-ui components from `@devmentor/ui` and `(admin)/admin.css`, which imports the shadcn theme.
  - Navigating between the two areas is a full page load (separate root layouts). That is intended.
- shadcn primitives live in `packages/ui/src/components/ui` (import `@devmentor/ui/components/ui/<name>`) and are added with the shadcn CLI from `packages/app` (both packages have a `components.json`). Customise them in place. Theme tokens are in `packages/ui/src/styles/globals.css`.
- Panel building blocks are imported as `@devmentor/ui/backend/<category>/<File>` (e.g. `@devmentor/ui/backend/forms/CrudForm`).
- Tailwind 4 is configured in CSS (`@import "tailwindcss"`, `@theme`, `@source`). There is no `tailwind.config.*`.

### Environment variables

- The single source of env vars is the root `.env` (git-ignored; template: `.env.example`). Docker compose, Next.js and the MikroORM CLI all read it.
- Package scripts that need env vars run through `with-root-env` (bin of `@devmentor/config`). Don't load env files from `next.config.ts`: Next.js resets `process.env` to its start-up snapshot, so the variables are lost.
- Read env vars in server code only, through `requiredEnv` / `integerEnv` from `@devmentor/shared`. Client code may read only `NEXT_PUBLIC_*` vars.
- Add every new variable to `.env.example` (no real secrets) and to the README env table.

## Next.js 16 conventions (summary)

The full, version-matched rules are in `packages/app/AGENTS.md`. Docs live in `node_modules/next/dist/docs/` at the repo root (npm hoists `next`). Key points:

- Server Components are the default. Add `"use client"` only to the smallest component that needs it.
- Cache Components is on:
  - Wrap request-time data and DB access in `<Suspense>` and call `await connection()` before uncached DB reads.
  - Alternatively, cache with `"use cache"` + `cacheLife` / `cacheTag`.
  - `dynamic`, `revalidate` and `fetchCache` segment options are not available.
- Request APIs are async (`await params`, `await cookies()`, ...). Type routes with `PageProps<'/route'>`, `LayoutProps<'/route'>` and `RouteContext<'/route'>`. Both root layouts use `LayoutProps<'/'>`.
- Middleware is called `proxy.ts`. Use `next/image`, `next/link` and `next/font`. Inside `packages/app`, use the `@/` alias (root of `packages/app`).

## `.ai/` metadata (mandatory)

All AI working metadata lives in `.ai/`. Every agent MUST use it as described here.

```
.ai/
├── specs/                      # Specifications for Spec-Driven Development (SDD)
│   ├── YYYY-MM-DD-slug.md      # Active specs (draft, approved, in progress)
│   ├── implemented/            # Specs whose implementation is complete and verified
│   └── archive/                # Obsolete, rejected or superseded specs
├── runs/                       # Logs of autonomous AI runs
│   └── YYYY-MM-DD-slug.md
├── lessons.md                  # Index of lessons learned (long-term memory) + lesson template
└── lessons/                    # One file per lesson
    └── YYYY-MM-DD-slug.md
```

### Naming convention

Every file in `specs/`, `runs/` and `lessons/` is named `YYYY-MM-DD-slug.md`:

- The date is the creation date in ISO 8601 format. It stays the same when the file is updated or moved.
- `slug` is short, lowercase kebab-case and descriptive. Example: `2026-10-13-add-login-page.md`.
- If the name is already taken, make the slug more specific. Never overwrite an existing file.

### Specs (`.ai/specs/`)

- **When a spec is required:** any non-trivial change. That means a new feature, a change in behavior, a new dependency, a change to data or a schema, or any work that needs design decisions or touches more than a few files. Trivial changes don't need a spec: typos, copy edits, small config tweaks, obvious one-line fixes.
- **Lifecycle:** `Draft` → `Approved` → `In progress` → `Implemented` (moved to `implemented/`), or `Archived` (moved to `archive/`). Keep the `Status` field current.
- If the user is available, get the draft approved before implementing it. In unattended runs, go ahead, but write your assumptions into the spec and the run log.
- The spec is the source of truth. If the implementation has to differ from it, update the spec first and note what changed and why.
- Before implementing a spec you didn't write in this session, check every path, package direction, API and dependency it names against this file and the code. Record conflicts and the decisions in the spec (a "Reconciliation" table) before writing code. See lesson `2026-10-13-reconcile-pre-drafted-specs`.
- Move specs with `git mv` (plain `mv` if the file is untracked). Never delete a spec.

Spec template:

```markdown
# <Title>

- **Status:** Draft | Approved | In progress | Implemented | Archived
- **Created:** YYYY-MM-DD
- **Runs:** links to related `.ai/runs/` logs

## Goal
The problem and the desired outcome in 1-3 sentences.

## Scope
In scope / out of scope.

## Requirements
1. Numbered, testable requirements.

## Design notes
Approach, affected routes and files, data flow, open questions.

## Acceptance criteria
- [ ] Checkable criteria used to verify the work.
```

### Runs (`.ai/runs/`)

- A **run** is one task session in which an agent changes the repository. Every run MUST have a log. Q&A or read-only sessions don't need one.
- Create the log when the run starts and update it while you work, not only at the end. That way an interrupted run can be picked up from the log.
- Past run logs are history. Don't rewrite them. A follow-up run gets its own log that links to the earlier one.

Run log template:

```markdown
# <Title>

- **Date:** YYYY-MM-DD
- **Agent:** <tool / model>
- **Spec:** `.ai/specs/...` or n/a
- **Status:** in progress | success | partial | failed

## Goal
## Plan
## Log
- Actions, decisions and assumptions, in order.
## Changes
- Files changed and why.
## Verification
- Commands run and their results.
## Open issues / next steps
## Lessons recorded
```

### Lessons (`.ai/lessons.md` + `.ai/lessons/`)

- At the start of every task, read `.ai/lessons.md`, then open the lesson files that are relevant to the task.
- **Add a lesson when:**
  - you fix a bug (record the root cause and how to avoid it),
  - the user corrects you,
  - you hit a non-obvious pitfall or tooling quirk,
  - you find a pattern worth reusing.
- **How to add one:** create `.ai/lessons/YYYY-MM-DD-slug.md` from the template in `.ai/lessons.md`. Then add a one-line entry to the index, newest first.
- If a lesson on the same topic already exists, update it instead of adding a duplicate.
- If a lesson should apply to every task, also turn it into a rule in this file.
- Never delete a lesson. Mark outdated ones `(obsolete)` and explain why.

## Task workflow

1. **Orient:** read `.ai/lessons.md`, look for an existing spec in `.ai/specs/`, and read the relevant code and Next.js docs.
2. **Specify:** for non-trivial work, write or update the spec. If the user is available, ask them to approve it.
3. **Log:** create the run log and write the plan in it.
4. **Implement:** follow the spec in small, focused steps and keep the run log updated.
5. **Verify:** run lint, type-check and build. For UI changes, check the page in the running app, including the browser console and the dev server output. Fix anything you broke.
6. **Learn:** record lessons.
7. **Close:** tick the acceptance criteria, set the spec's status and move it to `implemented/`, and set the final run log status. Then tell the user what changed, how you verified it and what is still open.

## Working principles

Adapted from [Boris Cherny's Claude Code tips](https://ykdojo.github.io/claude-code-tips/content/boris-claude-code-tips).

1. **Plan first, re-plan when stuck.** Put most of your effort into the plan (the spec plus the run log plan) so the implementation can be done in one pass. If things go wrong, stop and re-plan. Don't keep pushing a broken approach.
2. **Turn every correction into a rule.** When the user corrects you, or you fix your own mistake, record it right away as a lesson in `.ai/lessons/`. If it should apply every time, also add it to this file so the mistake isn't repeated.
3. **Fix bugs on your own.** Given a bug report, failing check or failing CI, investigate (logs, stack traces, lint, build) and fix it end to end without asking how. Ask only when the requirements are truly ambiguous.
4. **Prefer the elegant solution.** If a fix feels hacky, step back and ask: "knowing everything I know now, what is the clean solution?" Then replace the hack with it. Review your own diff critically before you call the work done.
5. **Keep context clean and automate repetition.** Hand off searches, research and parallel work to subagents. If a task keeps coming up, suggest turning it into a reusable script, command or skill committed to the repo.

## Definition of done

- All acceptance criteria are met, or any deviation is documented in the spec and the run log.
- `npm run lint`, the type-check and `npm run build` pass with no new warnings.
- UI changes have been checked in the running app.
- There are no leftovers: no debug `console.log`, no commented-out code, no TODOs without context.
- The spec, run log and lessons are updated, and a finished spec is in `implemented/`.

## Boundaries

**Always**

- Make focused changes that stay within the task or spec. Don't refactor unrelated code.
- Follow the existing code style, ESLint rules and TypeScript strict mode.
- Read before you write. Understand the existing code and docs before you change them.

**Ask first**

- Adding, removing or upgrading dependencies.
- Changing `next.config.ts`, any `tsconfig.json`, any `eslint.config.mjs` or `@devmentor/config` presets, `docker-compose.yml`, or CI/deployment configuration.
- Adding, removing or renaming a workspace package, or changing the dependency rules.
- Deleting files, or refactoring beyond the scope of the spec.
- Anything irreversible or that affects external systems: pushing, deploying, publishing, data migrations.

**Never**

- Commit secrets or `.env*` files, or write secrets, tokens or personal data into `.ai/` files.
- Push, force-push or rewrite git history without explicit permission.
- Silence problems to make checks pass, for example by disabling lint rules or using `@ts-ignore`, `any` or skipped verification.
- Delete specs, run logs or lessons.
- Edit `node_modules/`, `.next/` or generated files such as `next-env.d.ts`.
- Hand-edit the `<!-- BEGIN:nextjs-... -->` managed blocks in `packages/app/AGENTS.md`. `next dev` maintains them.
- Bypass the package boundaries, e.g. with relative imports into another package's `src/`, or by importing `awilix` outside `app`.
- Use the global `orm.em` in request code, or change the database schema without a migration.
- Call `fetch()` for `/api/*` outside `apiCall`, write a hand-rolled `try/catch` + `Response.json` in an API route, or pass a raw request body to a service or `em.create()`/`em.assign()`.
- Commit `.env`. Only `.env.example`, with placeholder values, is committed.

## Git

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:` (scope optional).
- Commit only when the user asks or the task explicitly includes it. Make one logical change per commit.
- Commit the `.ai/` updates (spec, run log, lessons) together with the code they describe. Also commit changes that `next dev` makes to `packages/app/AGENTS.md`.

## Maintaining this file

- Keep it short, specific and current. Every rule should prevent a real mistake.
- When a correction or lesson should apply to every task, add it here and record why in a lesson.
- Keep `CLAUDE.md` consistent with this file. It imports this file with `@AGENTS.md` and only adds short reminders. The same applies to `packages/app/CLAUDE.md` and `packages/app/AGENTS.md`.
- When the stack, package layout or a convention changes, update this file and `README.md` in the same change.
