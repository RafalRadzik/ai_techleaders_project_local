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
