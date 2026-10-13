# CLAUDE.md

@AGENTS.md

The full project instructions are in `AGENTS.md` (imported above) and apply in full. Key reminders for Claude:

- **Use the `.ai/` structure - it is mandatory:**
  - `.ai/specs/YYYY-MM-DD-slug.md` - specs for SDD; finished ones move to `.ai/specs/implemented/`, obsolete ones to `.ai/specs/archive/`.
  - `.ai/runs/YYYY-MM-DD-slug.md` - log of every autonomous run (create at start, update as you go).
  - `.ai/lessons.md` (index) + `.ai/lessons/YYYY-MM-DD-slug.md` - lessons learned; read before starting, add one after fixing a bug or learning something durable.
- Write a spec before implementing non-trivial changes.
- Never delete specs, runs or lessons; move or mark them instead.
- Keep `CLAUDE.md` and `AGENTS.md` consistent when the `.ai/` structure changes.
- **Reuse the shared layers:** API routes via `makeCrudRoute`/`apiHandler` (`packages/app/server/http`), client calls via `apiCall`, forms via `CrudForm`, lists via `DataTable` (`@devmentor/ui/backend/*`). Domain code goes in concept folders (see `AGENTS.md`).
- **Monorepo:** respect the package dependency rules in `AGENTS.md` (`core` stays framework-free; only `app` uses Awilix; only `db` uses MikroORM; `ui` is presentational). Before working in `packages/app`, also read `packages/app/AGENTS.md`.
- **Tests are mandatory:** every new feature or change ships with colocated Vitest unit tests that keep `npm run test:coverage` at 100%, and user-facing flows get `agent-browser` integration tests in `packages/integration`. CI (`.github/workflows/ci.yml`) runs lint, type-check, build, unit and integration on every PR. See "Testing" in `AGENTS.md`.
