# Set up the agent PR pipeline

- **Date:** 2026-10-15
- **Agent:** GitHub Copilot CLI / Claude Opus 5.5
- **Spec:** n/a (process/config setup driven by the `om-setup-agent-pipeline` skill)
- **Status:** success

## Goal

Configure the `om-*` skill collection for this repository: write `.ai/agentic.config.json`, install the tracker and browser descriptors, create the label taxonomy, and generate the missing process docs.

## Plan

1. Detect repo shape (tracker, default branch, validation commands from `package.json` + CI).
2. Interview the user for the settings.
3. Install `.ai/trackers/github.md` and `.ai/browsers/agent-browser.md`.
4. Create missing GitHub labels.
5. Generate `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md` (missing only; `AGENTS.md`/`CLAUDE.md` untouched).
6. Write the config, path directories, `.gitignore` entries.
7. Run the cross-skill coverage check.

## Log

- Detected: GitHub (`gh` authenticated), default branch `main`, npm workspaces (`package-lock.json`), CI jobs lint / typecheck / build / unit coverage / integration.
- User choices: tracker `github`, browser `agent-browser`, full label taxonomy, QA gate on, specs `.ai/specs`, validation gate `lint → typecheck → test:coverage → build` (integration tests left to CI because they need Docker + Chrome), generate all three missing docs, do not commit.
- Created 25 missing labels on GitHub; `bug` and `documentation` already existed and were left unchanged (no recolor).
- `AGENTS.md` and `CLAUDE.md` exist, so no `AGENTS.md` was generated.

## Changes

- `.ai/agentic.config.json` — pipeline config.
- `.ai/trackers/github.md`, `.ai/browsers/agent-browser.md` — shipped descriptors.
- `.ai/{analysis,specs,scripts,qa,runs}/.gitkeep` — configured path directories.
- `.gitignore` — ignore per-run QA artifacts and test-env state.
- `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md` — generated from this repo.

## Verification

- `gh label list` — all 27 taxonomy labels present.
- Cross-skill coverage check (`SKILLS_ROOT=.agents/skills`) — `SKILL_COVERAGE_OK`.
- `jq . .ai/agentic.config.json` — valid JSON.

## Open issues / next steps

- Changes are uncommitted at the user's request.

## Lessons recorded

- None.
