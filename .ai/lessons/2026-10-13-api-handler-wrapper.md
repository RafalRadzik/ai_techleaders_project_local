# Writing route-handler wrappers (apiHandler) for Next.js 16 + Awilix

- **Date:** 2026-10-13
- **Category:** pattern
- **Related:** `packages/app/server/http/apiHandler.ts`, `packages/app/server/http/makeCrudRoute.ts`, `packages/app/server/container.ts`

## Context

While building the shared `apiHandler` / `makeCrudRoute` layer, a few details turned out to matter for correctness.

## Finding

- With Cache Components, a `GET` route handler is prerendered unless it touches runtime data. `connection()` opts out, and during prerendering it may **throw** to interrupt static generation. A wrapper that calls it inside its `try/catch` would turn that signal into a 500.
- `getRequestContainer()` is memoised with React `cache`, which is a no-op outside a render. In a route handler every call creates a **new** scope (and a new forked `em`), so resolve it once and pass it down.
- `Response.json({ ok: true, data: undefined })` drops the `data` key. Client-side envelope checks (`"data" in body`) then fail, so wrappers must send `data: null` instead.
- Awilix `PROXY` mode passes the cradle as the first argument to `asFunction(fn)`. A factory with an options parameter (`createConsoleLogger(options?)`) would receive the cradle as options, and strict mode would try to resolve option names. Register it as `asFunction(() => createConsoleLogger())`.
- Next.js type-checks a route's exported handler context against `RouteContext<'/route'>`. Typing item handlers with `{ params: Promise<{ id: string }> }` makes exporting `PUT`/`DELETE` from a collection route a compile error, which is the behaviour we want.

## Resolution / Recommendation

Use `apiHandler` / `makeCrudRoute` for every API route instead of re-deriving these rules. When writing another wrapper (e.g. for Server Actions):

- call `connection()` outside the `try`,
- resolve the container once,
- never send `undefined` payloads.
