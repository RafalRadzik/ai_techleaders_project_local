# QA review contract fixes

## Problem / Goal

PR #9's QA worktree transition loses relative evidence paths and confuses
repository-owned environments with invocation-owned environments. Shared comment
operations in hybrid trackers also need explicit provider routing.

## Non-goals

No application behavior, live tracker mutations, dependency changes, or vendor
lockfile changes. Existing product-brief links remain unchanged.

## Approach

Anchor durable QA/browser paths before changing worktrees; resolve the environment
descriptor in the tested checkout. Use the prepare skill's existing
`TEST_ENV_REUSED` result and retain uncertain environments. Stop owned environments
in their originating context before removing worktrees. Document shared comment
dispatch without changing operation names or result shapes. Align gate examples.

## Acceptance criteria

- Extracted shell snippets preserve relative and absolute artifact overrides.
- Reused/unknown environments are not stopped or deprived of their worktree.
- Shared comment operations preserve provider context and opaque source handles.
- Both shipped and installed pipeline-label helpers pass bash/zsh regressions.
- The configured typecheck, lint, coverage, integration, and build gates pass.
