# PR #9 review contract fixes

## Requested

Fix the verified QA path/lifecycle and hybrid tracker routing findings in the
isolated PR review worktree. Add persistent extracted-snippet regressions and
align review gate examples. No GitHub writes, commits, pushes, or product changes.

## Changes

- QA setup anchors evidence, knowledge, and browser paths before worktree changes;
  artifact overrides retain invocation-relative/absolute semantics.
- Environment lookup follows the tested checkout config. Ownership uses the
  current prepare invocation's existing `TEST_ENV_REUSED` report; uncertain/reused
  environments and their worktrees remain intact. Teardown precedes removal.
- Shipped Linear/Jira shared comment operations explicitly dispatch PRs to GitHub
  and preserve source context, opaque handles, and outputs.
- Added `tests/contracts/skill-snippets.test.ts` and its Vitest include. Tests
  execute the actual documentation shell blocks, including both GitHub label
  helpers in bash and zsh. No production coverage scope was changed.
- Updated `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, a focused active spec,
  and the lesson index. Vendor edits remain local; lockfile hashes are unchanged.

## Verification / Outcome

The focused suite passed 35 tests. The same tests reading original `HEAD`
documents failed 17 and passed 18, proving regressions reproduce without fixes.
The first typecheck caught strict indexed-access types in the new tests; fixed
those assertions, then reran the full configured sequence successfully:

1. `npm run typecheck` — passed.
2. `npm run lint` — passed.
3. `npm run test:unit:coverage` — 52 tests passed (17 existing, 35 contract
   regressions); production coverage remained 100% for all four metrics.
4. `npm run test:integration` — 2 tests passed using the owned Testcontainers
   harness.
5. `npm run build` — passed.

Re-reviewed the changes against the prepare entrypoint/report and native tracker
contracts; `git diff --check` passed. Both bash and zsh regressions ran (no skips).

No live Linear/Jira API verification was attempted. Parent owns publication and
merge. Restored only generated `next-env.d.ts` changes and removed baseline scratch
output; test fixtures clean themselves up. No untracked cleanup files remain.
