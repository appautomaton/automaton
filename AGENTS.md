# AGENTS.md — automaton

Portable, stage-gated agentic-AI harness for Claude Code, Codex, and OpenCode.

## Architecture

- **Copy-based install.** Skills and shared runtime files are inspectable after install. `_shared/` installs once under `.agent/.automaton/` where host skills can reference it (see `docs/design-decisions.md` DD-001).
- **Skills are pure markdown.** `SKILL.md` + `references/` + optional `templates/`. Shared helper scripts live in `skills/_shared/scripts/`.
- **Three hosts.** Claude, Codex, OpenCode — each wires startup context through host hooks/plugins and maps subagent tools.
- **Five stages.** `frame → plan → execute → verify → resume`. Prerequisites enforced in `runtime/lib/contracts-data.json`.
- **No mandatory nested invocation.** Skills hand off through durable artifacts; clean same-session continuation is allowed when the lifecycle contract says it is safe.

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
- Shared references and scripts go in `skills/_shared/`. Install copies them once into `.agent/.automaton/references/` and `.agent/.automaton/scripts/`.
- Skill entry points should stay clear, concise, high-signal, and platform-agnostic. Detail belongs in `references/` via `## Deep` triggers when progressive disclosure keeps the entry point easier to use.
- `current.json` is the machine cursor. `STATUS.md` is the human summary. Don't duplicate pointers.
- Runtime enforces only L1 validation (stage enum, pointer resolution). L2/L3 live in prompts and tests.

## Design Documentation

- [`docs/design-decisions.md`](docs/design-decisions.md) — architectural choices with rationale
- [`docs/progressive-disclosure.md`](docs/progressive-disclosure.md) — four-layer progressive disclosure model
