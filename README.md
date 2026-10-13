# DevMentor

DevMentor is a web application built with Next.js 16, React 19 and TypeScript. It stores data in PostgreSQL through MikroORM and is organised as an npm-workspaces monorepo.

## Getting started

Prerequisites: Node.js ≥ 22.17 (MikroORM 7 requirement), npm 11, Docker (for the local database).

```bash
cp .env.example .env      # single env file for the whole monorepo
npm install               # installs and links all workspaces
npm run db:up             # starts PostgreSQL 18 in Docker (waits until healthy)
npm run db:migrate        # applies MikroORM migrations
npm run dev               # http://localhost:3000
```

- Public site: <http://localhost:3000>
- Admin: <http://localhost:3000/admin> (users: <http://localhost:3000/admin/users>)
- Users API: `GET` / `POST` <http://localhost:3000/api/users> (unauthenticated until auth is added; local development only)
- Health check: <http://localhost:3000/api/health> (returns `200` when up, `503` when down)

## Scripts (run from the repo root)

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server (`@devmentor/app`) |
| `npm run lint` | ESLint in every workspace (includes the package-boundary rules) |
| `npm run typecheck` | `tsc --noEmit` in every workspace (`next typegen` first for the app) |
| `npm run db:up` / `db:down` | Start / stop the local PostgreSQL container |
| `npm run db:migration:create` | Generate a migration from entity changes (`-- --initial` for the first one) |
| `npm run db:migrate` / `db:migrate:down` | Apply pending migrations / roll back the last one |
| `npm run db:migration:list` | Show executed migrations |

## Architecture

### Packages

```
packages/
├── app/     @devmentor/app     Next.js app: routes, pages, route handlers; DI composition root
├── core/    @devmentor/core    Domain models, services, ports (interfaces) and Zod validators. No framework/ORM/DI.
├── db/      @devmentor/db      MikroORM: config, entities, repositories (port adapters), migrations
├── ui/      @devmentor/ui      shadcn-ui components, theme and panel building blocks (apiCall, CrudForm, DataTable) for the admin pages
├── shared/  @devmentor/shared  Framework-free utilities and types (env helpers, error classes, API envelope, logger)
└── config/  @devmentor/config  tsconfig + ESLint presets, `with-root-env` script
```

Dependency direction. Arrows point to what a package may import. It is enforced by ESLint (`packages/config/eslint/boundaries.mjs`):

```
            ┌──────────── app ────────────┐
            ▼              ▼              ▼
            ui             db  ─────────► core
            │              │              │
            └──────────────┴──► shared ◄──┘
```

- **`core` is the heart of the system.** It contains business logic and defines **ports** (e.g. `UserRepository`, `HealthIndicator`). It has no idea about Next.js, React, MikroORM or Awilix, which keeps it easy to test and reuse.
- **`db` contains adapters.** It implements the `core` ports with MikroORM and owns the schema (entities and migrations).
- **`app` integrates everything.** It wires concrete implementations to ports in the Awilix container and exposes them through pages and route handlers.
- **`ui` is presentational.** It holds shadcn-ui components without any data access.
- Workspace packages are consumed as **TypeScript source** (their `exports` point at `src`). Turbopack transpiles them, so there is no per-package build.

### Domain concepts

Each domain concept (`users` today; `auth`, `mentors`, `bookings`, ... later) is a same-named folder in every layer that needs it:

```
packages/core/src/services/users/       user.ts, user.service.ts, user-repository.port.ts
packages/core/src/validators/users/     user-create.schema.ts   (Zod; shared by route + form)
packages/db/src/entities/users/         user.entity.ts
packages/db/src/repositories/users/     user.repository.ts
packages/app/app/api/users/route.ts     makeCrudRoute(...)
packages/app/app/(admin)/admin/users/   page.tsx + users-panel.tsx (apiCall, CrudForm, DataTable)
```

Folders are created with a concept's first file, never in advance. The full standards (naming, principles, security, review checklist) are in [`.ai/specs/implemented/2026-09-01-engineering-standards.md`](.ai/specs/implemented/2026-09-01-engineering-standards.md).

### API conventions

- Route handlers are built with `makeCrudRoute` (plain CRUD) or `apiHandler` (workflows) from `packages/app/server/http/`. No route writes its own `try/catch`.
- Responses use one envelope: `{ ok: true, data }` or `{ ok: false, error: { code, message, fieldErrors? } }`. Services throw the error classes from `@devmentor/shared`, which map to statuses: `ValidationError` 400, `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409, other `AppError` 422, anything else 500 (logged, never leaked).
- State-changing requests must carry `x-devmentor-client: 1` (CSRF guard). `apiCall` in `@devmentor/ui/backend/api/apiCall` sets it and is the only place the client calls `fetch()` for `/api/*`.
- `/api/health` is the exception: a monitoring probe that keeps its plain JSON body and `200`/`503` status.

### Request flow

```
Request ─► Next.js page / route handler (packages/app)
             │  apiHandler / makeCrudRoute     ← envelope, error mapping, CSRF header (route handlers)
             │  getRequestContainer()          ← Awilix scope per request (React cache)
             ▼
           HealthService / UserService         ← @devmentor/core (plain classes, constructor injection)
             │  depends on ports
             ▼
           MikroOrmUserRepository / DatabaseHealthIndicator  ← @devmentor/db adapters
             │  forked EntityManager (scoped)
             ▼
           MikroORM (singleton, connection pool)  ─►  PostgreSQL
```

### Dependency injection (Awilix)

- **Composition root:** `packages/app/server/container.ts`, `server-only`, `InjectionMode.PROXY`, `strict: true`.
- **Singletons:** `orm`, the MikroORM instance that owns the connection pool, and `logger`.
- **Scoped (per request):**
  - `em`, a forked EntityManager, so identity maps never leak between requests.
  - Repositories and services.
- **Services:** declare dependencies as a destructured constructor argument, `constructor({ userRepository }: Deps)`, and never import Awilix.

### Database (MikroORM 7 + PostgreSQL)

- **Entities:** defined with `defineEntity` (no decorators or reflect-metadata) and registered explicitly in `packages/db/src/entities/index.ts`.
- **Runtime config:** `createOrmConfig()` (`packages/db/src/config.ts`) reads `DATABASE_URL` and the pool settings.
- **CLI config:** `packages/db/src/mikro-orm.config.ts` adds the Migrator. Migrations and their schema snapshot are in `packages/db/src/migrations`.
- **ORM instance:** one per process (`getOrm()`), cached on `globalThis` to survive dev hot reloads without opening new pools.
- **Schema changes:** every change ships as a reviewed migration (`npm run db:migration:create` → review → `npm run db:migrate`).

### Frontend vs admin UI

The Next.js app has two **root layouts** (route groups), each with its own stylesheet:

| Area | Route group | URL | Styling |
| --- | --- | --- | --- |
| Public site | `app/(frontend)` | `/` … | Tailwind CSS 4 utilities (`(frontend)/globals.css`) |
| Admin / backend | `app/(admin)/admin` | `/admin` … | shadcn-ui components from `@devmentor/ui` (`(admin)/admin.css`) |

To add a shadcn component, run `cd packages/app && npx shadcn@latest add <component>`. The CLI installs it into `packages/ui/src/components/ui`. Import it as `@devmentor/ui/components/ui/<component>`. Panel building blocks live in `packages/ui/src/backend` (`@devmentor/ui/backend/<category>/<File>`).

Next.js is configured with Cache Components and Partial Prefetching. Live data, such as the admin system status, is rendered inside `<Suspense>` after `await connection()`.

### Environment variables

All tools read **one root `.env`**: Next.js, the MikroORM CLI and Docker Compose. Package scripts load it through `with-root-env` (from `@devmentor/config`). Variables already set in the environment (CI, hosting) take precedence.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — (required) | PostgreSQL connection string |
| `DATABASE_POOL_MIN` / `DATABASE_POOL_MAX` | `2` / `10` | Connection pool size |
| `DATABASE_POOL_IDLE_TIMEOUT_MS` | `30000` | Idle connection timeout |
| `MIKRO_ORM_DEBUG` | `false` | Log SQL queries |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | `devmentor` / `devmentor` / `devmentor` / `5432` | Local Docker database |

## Working with AI agents

[`AGENTS.md`](AGENTS.md) is the source of truth for coding agents. It covers the stack, the package rules and the workflow. [`packages/app/AGENTS.md`](packages/app/AGENTS.md) adds Next.js 16 specifics. AI working metadata lives in `.ai/`:
- specs: `.ai/specs`
- run logs: `.ai/runs`
- lessons learned: `.ai/lessons.md`
