# Implementation tracker — Accounts and Roles (E01)

Spec: `.ai/specs/2026-09-04-accounts-and-roles.md`
Branch: `feat/e01-accounts-and-roles`

Legend: `[ ]` todo · `[x]` done. Step numbers refer to the spec's Implementation Plan.
Each phase ends with a manual-test checkpoint; the next phase starts only after sign-off.

## Phase 1 — React test toolchain (Slice 1, spec steps 1–2)

- [x] 1.1 Reconcile test deps/config: add missing `@testing-library/user-event`, `@vitejs/plugin-react`; React plugin in `vitest.config.mts`; per-file `// @vitest-environment jsdom`, node stays default (step 1)
- [x] 1.2 Document the component-testing approach in `AGENTS.md` (server components invoked directly, client components under jsdom, two mocking seams for redirects) (step 2)

**Checkpoint:** `npm run test:unit:coverage`, `npm run typecheck`, `npm run lint` green.

## Phase 2 — Auth platform primitives (Slice 2, steps 3–9)

- [x] 2.1 Clock primitive `core/src/time/clock.ts` + container/cradle registration (step 3)
- [x] 2.2 `ServiceUnavailableError` + `AppError.headers`, `safeReturnTo`, `fetchJson` (step 4)
- [x] 2.3 Env vars + two-signal `superRefine` + production-secret check in `createContainer`; mirror in `.env.example`, `README.md`, `ci.yml`, integration env (step 5)
- [x] 2.4 `auth-identity` migration + `User` entity fields + roles CHECK + verified backfill + seeder (step 6)
- [x] 2.5 Token service (`jose`, purpose tokens) (step 7)
- [x] 2.6 Session service (issue/verify/clear, hand-rolled cookie) (step 8)
- [x] 2.7 Live `requireSession`, `Role` rename + `roles` set, `withRequestScope` + scoped `session`, CSRF in `apiHandler`; BACKWARD_COMPATIBILITY §2/§7 (step 9)

**Checkpoint:** unit tests + coverage green; `npm run db:migrate` / `db:migrate:down` / `db:seed` work locally; app still boots and `/` renders.

## Phase 3 — GitHub sign-in and data protection (Slice 2, steps 10–17)

- [x] 3.1 GitHub identity port + real and mock adapters + container selection (step 11)
- [x] 3.2 `findOrCreateFromGithub` with race handling, operator reconciliation, `grantRole`/`revokeRole`, `UserDto` fields (steps 10, 12)
- [x] 3.3 Remove `POST /api/users` + `userCreateSchema`; operator-guard `GET` at route and service (step 13)
- [x] 3.4 Auth routes: `/api/auth/github`, `/callback`, `/logout` (step 14)
- [x] 3.5 Page guards `app/src/lib/session.ts`, sign-out `WorkflowAction`, ESLint third-party boundaries (step 15)
- [x] 3.6 Pages: `/sign-in`, `(mentee)/home`, `(mentor)/mentor`, guarded admin pages; `signInAs` + `auth.integration.test.ts`; admin test signs in (step 16)
- [x] 3.7 Docs: `AGENTS.md`, `README.md`, `BACKWARD_COMPATIBILITY.md`, `CODE_REVIEW.md`, `base.entity.ts` docblock (step 17)

**Checkpoint:** sign in with GitHub (or mock persona), land on role home, sign out, `/admin` refused for non-operators.

## Phase 4 — Signed-in shell and R07 (Slice 3, steps 18–20)

- [x] 4.1 `AppShell` (F2) reconcile with spec + three-surface taxonomy in `AGENTS.md` (step 18)
- [x] 4.2 `app/src/lib/nav.ts` + port the three signed-in layouts to `AppShell` without touching guard calls (step 19)
- [x] 4.3 `expectAbsent` helper + `roles.integration.test.ts` (step 20)

**Checkpoint:** navigation per role/combined roles; no "become a mentor" path.

## Phase 5 — Email and password (Slice 4, steps 21–28)

- [x] 5.1 `auth-password` migration + `passwordHash` + seeder hashes (step 21)
- [x] 5.2 Password service (scrypt + concurrency gate); amend standards spec (step 22)
- [x] 5.3 Rate limiter + `TooManyRequestsError` + `AuthRateLimit` entity/migration (step 23)
- [x] 5.4 Mailer port + Resend/log adapters + `waitForMail` (step 24)
- [x] 5.5 Email verification service (step 25)
- [x] 5.6 `register` / `login` schemas (step 26)
- [ ] 5.7 `registerWithPassword` / `authenticateWithPassword` (step 27)
- [ ] 5.8 Routes, `CrudForm` password field, `/register` page, enable email form on `/sign-in`, integration (step 28)

**Checkpoint:** register → verify via mail link → mentee home; wrong password is generic; rate limit trips.
