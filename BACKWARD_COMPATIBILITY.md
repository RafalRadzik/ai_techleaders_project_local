# Backward compatibility

What this repository treats as a protected contract surface, what counts as a breaking
change to each, and the path such a change must take. Review skills check every PR
against this file; implementation skills warn when a change is not compliant. Humans
use it the same way.

The consumers of these surfaces are inside the repository today: the four workspace
packages consume each other as TypeScript source, the integration harness under
`tests/integration/` drives the running app, CI and the branch ruleset key on script
and job names, and the local tooling (`docker-compose.yml`, `openmercato.toml`,
`scripts/preview.sh`) keys on npm scripts. The packages are private (`0.1.0`,
unpublished), so there is no external semver to bump. "Breaking" therefore means: a
consumer listed below stops working, or an operator following `README.md` gets a
different result.

## General rule

Additive changes are free: a new optional field, a new export, a new route, a new
event, a new environment variable with a default. Everything else on a surface below is
a breaking change and follows the path in "How to make a breaking change" at the end.

## Surfaces

### 1. HTTP API (`packages/app/src/app/api/`)

**The envelope.** Every `/api/*` route built with `apiHandler` or `makeCrudRoute`
answers `{ ok: true, data }` or
`{ ok: false, error: { code, message, fieldErrors?, retryAfterSeconds? } }`.
The shape is declared twice on purpose, in `packages/core/src/http/apiHandler.ts` and
`packages/ui/src/backend/api/types.ts`, because `ui` must not import `core`.

**Status and error codes**, from `packages/core/src/http/errors.ts` and `apiHandler.ts`:
400 `bad_request`, 401 `unauthorized`, 403 `forbidden`, 404 `not_found`,
409 `conflict`, 422 `validation_failed` (with `fieldErrors`, keyed by dotted path or
`_root`), 500 `internal_error`, 503 `service_unavailable` (`ServiceUnavailableError`:
an integration credential is unset, an upstream call made through `fetchJson` timed
out or failed, or a capacity gate is saturated; retryable), 429 `rate_limited`
(`TooManyRequestsError`, added in E01 Slice 4, additive: a rate-limit policy of
`packages/core/src/http/rate-limit.ts` was exceeded; the envelope carries
`retryAfterSeconds` and the response a matching `Retry-After` header; the message is
generic and never reveals whether an email exists). An `AppError` may carry optional
`headers`, which `apiHandler` copies onto the error response, and an optional
`retryAfterSeconds`, which it puts in the envelope. The client
adds `network_error` and `invalid_response` in `apiCall.ts`.

**Routes in place:**

- `GET /api/health`: a plain JSON probe, not enveloped:
  `{ status: "ok", app, environment, database: "up" | "down", databaseError? }`, HTTP
  200 even when the database is down. `tests/integration/global-setup.ts` polls it and
  waits for `status === "ok"` and `database === "up"`; `README.md` documents it.
- `GET /api/users` returns `UserDto[]`, where
  `UserDto = { id, email, displayName, roles, githubLogin, avatarUrl, createdAt (ISO string), mentorProfile: { id, headline } | null }`.
  It is **operator only**: `401` without a live session, `403` without the `operator`
  role — enforced by the route's `authorize` and again inside `UserService.list`. It was
  public until E01 (accounts and roles); `POST /api/users` (`{ email, displayName }`) was
  removed at the same time — it had no in-repo caller, and accounts are now created only
  by the sign-in flows.
- `GET /api/auth/github` and `GET /api/auth/github/callback` (added in E01, additive):
  browser-navigated, not enveloped. Every outcome is a 302 built with
  `redirectResponse`: the start route sets the `devmentor_oauth_state` cookie and
  redirects to GitHub; the callback redirects to the role's home (or a safe
  `returnTo`) with the `devmentor_session` cookie, or to `/sign-in?error=<code>` on any
  failure.
- `POST /api/auth/logout` (added in E01, additive): enveloped, CSRF-checked, no session
  required. Always answers `{ ok: true, data: null }` with an expiring
  `devmentor_session` cookie; a live session also has its `session_version` bumped,
  which revokes every copy of the cookie.
- `makeCrudRoute` behavior asserted by `packages/core/src/http/makeCrudRoute.test.ts`:
  the default id parameter `id`, and the messages "This operation is not supported",
  "Missing resource id", and "Request body must be valid JSON".

**Breaking:** removing or renaming a response field; changing a status code, an error
code, or the envelope shape; making a currently public route require a session without
shipping the client side of it; changing `/api/health` to return non-200 on database
loss (the file itself calls this out as an option; it also breaks the readiness poll).

**Required path:** change both envelope declarations together; update the unit tests
and the integration scenarios that assert on the route; update `README.md` where the
route is documented; list the change under "Breaking changes" in the PR body. A new
error code is additive as long as existing codes keep their meaning.

### 2. Workspace package exports

The `exports` maps in each `package.json` and the named exports behind them are the
API between packages. `npm run typecheck` is the consumer check.

- `@devmentor/core` (`.`, `./container`, `./services`, `./http`, `./events`,
  `./validators/*`): `getEnv`, `createLogger`, `getContainer`, `withScope`,
  `withRequestScope(req, fn)`, `withSessionCookieScope(cookieValue, fn)`, the
  `Cradle` keys (`env`, `logger`, `orm`, `clock`, `eventBus`, `sessionService`,
  `tokenService`, `passwordService`, `identity`, `em`, `userService`, the scoped
  `rateLimiter` (added in E01 Slice 4), and the scoped, lazy
  `session: Promise<Session | null>`), `UserService` and `UserDto`, the `AppError`
  family and `isAppError`, `apiHandler(logic, { csrf? })` with `ApiHandlerOptions`,
  `jsonOk`, `jsonError`, `makeCrudRoute` with `CrudService` and
  `MakeCrudRouteOptions`, `requireSession(req, cradle)`, `requireRole`,
  `requireCsrfHeader`, `CSRF_HEADER_NAME`, `assertOwnership`, `Session`
  (`{ userId, roles: readonly [Role, ...Role[]] }`), `Role`
  (`'mentee' | 'mentor' | 'operator'`), `EventBus`, `EventMap`, and the re-exported
  `checkDbConnection`. Added in E01 (additive): `ServiceUnavailableError`;
  `TooManyRequestsError` and the rate limiter (`RateLimiter` with `consume`/`consumeAll`,
  `RateLimitPolicy`, `RateLimitCheck`, the policy constants `SIGN_IN_PER_IP`,
  `SIGN_IN_PER_EMAIL`, `REGISTRATION_PER_IP`, `VERIFICATION_RESEND_PER_EMAIL`,
  `LONGEST_RATE_LIMIT_WINDOW_MS`, the key helpers `rateLimitKey`, `clientIp`,
  `signInLimits`, `registrationLimits`, `verificationResendLimits`, and
  `guardCredentialAttempt`, which fixes the gate → limit → hash ordering);
  `systemClock` and `Clock`; `SessionService` (`SESSION_COOKIE_NAME`,
  `readSessionCookie`, `SessionClaims`, `IssuedSession`) and `TokenService`
  (`PurposeTokenClaims`, `SignPurposeTokenInput`); the GitHub identity port
  (`GithubIdentityPort`, `GithubIdentity`, `GITHUB_CALLBACK_PATH`,
  `githubCallbackUrl`, `NoVerifiedEmailError`); the OAuth state helpers
  (`createOauthState`, `verifyOauthState`, `clearOauthStateCookie`,
  `OAUTH_STATE_COOKIE_NAME`, ...); the sign-in redirect helpers (`SIGN_IN_PATH`,
  `SIGN_IN_ERRORS`, `signInErrorLocation`, `signInFailure`); `homeFor` (the single
  landing decision: `operator → /admin`, `mentor → /mentor`, else `/home`) and
  `liveRoles`; the cookie helpers `readCookie`, `serializeCookie`, `redirectResponse`
  with `CookieAttributes`; `fetchJson` (the outbound-call wrapper with a timeout,
  `DEFAULT_OUTBOUND_TIMEOUT_MS`); `safeReturnTo`; and on `UserService`,
  `AccountNotLinkedError`, `LastRoleError`, `RoleChange`, `AssignableRole`.
  `requireSession(req, cradle)` replaced the
  stubbed `requireSession(req)`, `Session.roles` replaced `Session.role`, `student`
  became `mentee`, and the unverified `readSession` was removed — the only way to
  obtain a `Session` is the live check (cookie, user row, `session_version`, stored
  roles with `operator` resolved against `OPERATOR_EMAILS`). `userCreateSchema` (and
  `validators/auth/user-create.schema`) was removed with `POST /api/users`; it had no
  consumer. `UserService.create` takes the explicit `UserCreateInput`
  (`{ email, displayName }`, still exported) and copies only those two fields, so it
  cannot set `roles` or any other column. `UserService` also takes the scoped `session`
  as a constructor dependency, and `list()` requires an `operator` session.
- `@devmentor/db` (`.`, `./entities`, `./config`): `User`, `MentorProfile`, `IUser`,
  `IMentorProfile`, `AuthRateLimit` and `IAuthRateLimit` (added in E01 Slice 4), `baseProperties`, `entities`, `createOrmConfig`, `getOrm`,
  `closeOrm`, `checkDbConnection`, `getDbEnv`, `MikroORM`, `EntityManager`, and the
  re-exported `EntityRepository`, `FilterQuery`, `Loaded`, `RequiredEntityData`.
- `@devmentor/ui` (`.`, `./backend`, `./tokens.css`, `./lib/utils`, `./components/*`):
  `cn`, `Button` and `buttonVariants`, the `Card*` family; from `./backend`:
  `apiCall`, `apiCallOrThrow`, `ApiError`, `ApiCallOptions`, `ApiResult`,
  `FieldErrors`, `CrudForm` with `CrudField`, `CrudFieldType`, `CrudFormProps`,
  `DataTable` with `Column`, `DataTableProps`, `DataTablePagination`,
  `LoadingMessage`, `ErrorMessage`, `EmptyState`; from `./tokens.css`: the CSS
  variable names (`--background`, `--foreground`, `--primary`, `--destructive`,
  `--border`, `--ring`, ...) that Tailwind utilities map onto.

**Breaking:** removing an export or a subpath; changing a function signature, a
component prop, or a `Cradle` key; changing the dependency direction
(`app -> core -> db`, `ui` standalone) enforced by `eslint.config.mjs`.

**Required path:** update every in-repo consumer in the same PR so `npm run typecheck`
and `npm run lint` stay green; keep the old name as a re-export for one PR only when
the change spans several concepts; note it in the PR body.

### 3. Database schema, migrations, and seed data (`packages/db/`)

- Tables: `users` (`id` uuid, `created_at`, `updated_at`, `email` unique,
  `display_name`) and `mentor_profiles` (`id`, timestamps, `user_id` unique with a
  cascading foreign key to `users`, `headline`, `bio` nullable,
  `years_of_experience` default 0). Column names are snake_case mappings of the
  camelCase entity properties. `auth_rate_limits` (added in E01 Slice 4,
  `Migration20261023135729_auth_rate_limit`): `key` text primary key
  (`<scope>:<kind>:<sha256hex>`, never a raw email or IP), `window_start` timestamptz
  indexed, `count` int — the one table without the uuid id and timestamps, and written
  only by `RateLimiter`'s raw SQL. Its rows are short-lived counters: dropping or
  emptying it only resets the current windows.
- Migrations live in `packages/db/migrations/Migration<timestamp>.ts` next to the
  committed snapshot `.snapshot-devmentor.json`, run transactionally, and are
  generated with `npm run db:migration:create -- --name <x>`. The integration harness
  pins `MIKRO_ORM_MIGRATIONS_SNAPSHOT_NAME=.snapshot-devmentor` so a test run never
  creates a second snapshot.
- The seeder `packages/db/src/seeders/database.seeder.ts` creates one user
  (`ada@devmentor.dev`, `Ada Lovelace`) with a mentor profile
  (`Systems & algorithms mentor`). `tests/integration/admin.integration.test.ts`
  asserts on those exact cells.

**Breaking:** dropping or renaming a table or column; tightening a constraint that
existing rows may violate; editing an already applied migration or the snapshot by
hand; changing the seeded values the integration test asserts on.

**Required path:** a new migration with both `up` and `down`, exercised in both
directions; a rollback plan in the PR body; renames as expand-then-contract (add the
new column, backfill, switch the code, drop the old column in a later PR); the seeder
and the integration test updated together; `risk-high` plus `needs-qa` per `SDLC.md`.

### 4. Configuration and environment

Variables, as listed in `.env.example`: `NODE_ENV`, `APP_NAME`, `LOG_LEVEL`,
`DATABASE_URL` (takes precedence), `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `DB_POOL_MIN`, `DB_POOL_MAX`, `DB_POOL_IDLE_MS`, `DB_DEBUG`. Two zod
schemas describe them, `packages/core/src/config/env.ts` for the app and
`packages/db/src/env.ts` for the MikroORM CLI, and they must agree. The harness sets
`NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`, and pool sizes in
`tests/integration/environment.ts`; `.github/workflows/ci.yml` sets
`NEXT_TELEMETRY_DISABLED`.

**Breaking:** a new variable without a default; renaming or removing a variable;
changing a default in a way that changes runtime behavior; dropping the
`DATABASE_URL` precedence.

**Required path:** both schemas, `.env.example`, `README.md`, the CI workflow, and the
harness environment updated in the same PR; a default wherever one is sensible.

### 5. npm scripts and CI check names

The root `package.json` scripts are this repository's command-line interface. They are
referenced by `README.md`, `AGENTS.md`, `.github/workflows/ci.yml`,
`.ai/agentic.config.json` (`validation.commands`), `SDLC.md`, `openmercato.toml`
(`scripts/preview.sh` runs `npm run dev`), and `tests/integration/run.sh` and
`run.ps1`. The CI job names `Build`, `Lint`, `Unit tests`, and `Integration tests` are
what the branch ruleset requires.

**Breaking:** renaming or removing a script; renaming a CI job.

**Required path:** update every reference above in the same PR; for a job rename, a
maintainer updates the ruleset before the PR merges, otherwise the PR blocks itself.

### 6. Domain events (`packages/core/src/events/event-map.ts`)

Event ids follow `concept.entity.action`. Today: `auth.user.created` with payload
`{ userId, email }`, and `auth.user.roles_changed` with payload
`{ userId, roles, previousRoles }` (added in E01, additive), both subscribed in
`packages/core/src/container/container.ts`.

**Breaking:** renaming an event id; removing or retyping a payload field.

**Required path:** add the new event, move subscribers, remove the old event in a later
PR; adding a payload field is additive.

### 7. Session and CSRF conventions

The session cookie name `devmentor_session` lives in
`packages/core/src/services/auth/session.service.ts`. The short-lived OAuth state cookie
`devmentor_oauth_state` (path `/api/auth/github`, 10 minutes, added in E01) lives in
`packages/core/src/services/auth/oauth-state.ts`. The `Role` union
(`'mentee' | 'mentor' | 'operator'`) and the CSRF header name live in
`packages/core/src/http/auth.ts`. The CSRF header `x-devmentor-request` is set by
`apiCall` in `packages/ui/src/backend/api/apiCall.ts` on every request and is
**enforced by `apiHandler` on every `/api/*` request whose method is not `GET`, `HEAD`
or `OPTIONS`** — including `makeCrudRoute`'s `POST`/`PUT`/`DELETE` — with a 403
`forbidden` before the route body runs. Its presence is checked, not its value. The
only opt-out, `apiHandler(logic, { csrf: false })`, is reserved for the webhook route.
Every state-changing route is therefore JSON-only and called through `apiCall` or
`CrudForm`, never a native HTML form.

**Breaking:** renaming either cookie or the header, changing the `Role` values, or
relaxing which methods require the header.

**Required path:** change `core/src/http/auth.ts` and `ui/src/backend/api/apiCall.ts`
together, with an integration scenario covering the denied path.

### 8. Product decisions (`.ai/specs/product-brief.md`)

The Non-goals, Business rules, and Decisions tables carry stable ids, owners, and a
review-by date. A PR that builds what a non-goal excludes, or contradicts a rule or a
decision, is a review blocker unless the same PR carries a superseding entry approved
by the entry's owner. `SDLC.md` describes the mechanism.

## How to make a breaking change

1. Name the surface and the entry above in the PR body under a "Breaking changes"
   heading, and say who is affected and how they migrate.
2. Update this file in the same PR when the surface itself changes shape.
3. Update every in-repo consumer in the same PR; the validation gate
   (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`) and the CI
   integration check are the proof.
4. Prefer expand-then-contract over a single cut for schema and export renames.
5. Label the PR `risk-high` where `SDLC.md` says so (schema migrations, shared
   contract surfaces, auth, money) and get a second reviewer.

## What is not protected

Internal, unexported helpers; the markup of the admin and public pages beyond the
semantics the integration tests assert on (the headings `Dashboard` and `Users`, the
link `Users`, the text `Connected`, the seeded table cells, and the landing heading
`Grow faster with the right mentor.`); Tailwind class choices; and the placeholder
`User` and `MentorProfile` fields, which `README.md` describes as a demo model. Even
those change through migrations and tests, only without the breaking-change paperwork.
