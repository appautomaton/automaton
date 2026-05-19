# AGENTS.md — automaton

Portable, stage-gated agentic-AI harness for Claude Code, Codex, and OpenCode.

## Architecture

- **Copy-based install.** Skills are self-contained after install. `_shared/` fans out into each skill at install time (see `docs/design-decisions.md` DD-001).
- **Skills are pure markdown.** `SKILL.md` + `references/` + `scripts/`. No compiled binaries.
- **Three hosts.** Claude, Codex, OpenCode — each wires hooks and maps subagent tools.
- **Five stages.** `frame → plan → execute → verify → resume`. Prerequisites enforced in `runtime/lib/contracts-data.json`.
- **No nested invocation.** Skills recommend the next skill; they never call each other.

## Layout

```
bin/        CLI (install, status, validate, context)
hosts/      Host adapters (Claude, Codex, OpenCode)
lib/        CLI + install library (re-exports runtime)
runtime/    Installed into target projects (state, context, validation)
skills/     Skill sources — edit here, not in installed copies
  _shared/  Shared refs + scripts (installed) and authoring guides (not installed)
  auto-*/   Individual skills
tests/      node --test tests/*.test.mjs
docs/       Design rationale (not shipped in npm package)
```

## Commands

```bash
npm test                               # all tests
node --test tests/contracts.test.mjs   # targeted test
node bin/automaton.mjs install --claude .
node bin/automaton.mjs status
node bin/automaton.mjs validate
node bin/automaton.mjs context frame
```

`cli-smoke.test.mjs` is slow (full tree copy). Prefer targeted tests.

## Conventions

- Edit skills in `skills/` only. Never edit installed copies.
- Shared references and scripts go in `skills/_shared/`. Install copies them to every skill.
- Skill entry points: ≤ 500 lines (enforced by test). Detail goes in `references/` via `## Deep` triggers.
- `current.json` is the machine cursor. `STATUS.md` is the human summary. Don't duplicate pointers.
- Runtime enforces only L1 validation (stage enum, pointer resolution). L2/L3 live in prompts and tests.

## Design Documentation

- [`docs/design-decisions.md`](docs/design-decisions.md) — architectural choices with rationale
- [`docs/progressive-disclosure.md`](docs/progressive-disclosure.md) — four-layer token budget model
