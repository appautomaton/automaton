# Automaton

Portable, stage-gated agentic-AI harness for Claude Code, Codex, and OpenCode.

Automaton installs a small set of markdown skills plus runtime hooks into a project. The workflow is:

```text
office-hours -> frame -> plan -> engineering review -> execute -> verify -> resume
```

## Install

Run from the project you want to equip:

```bash
npx @appautomaton/automaton install --codex .
npx @appautomaton/automaton install --claude .
npx @appautomaton/automaton install --opencode .
```

Install all host surfaces:

```bash
npx @appautomaton/automaton install --all .
```

Uninstall Automaton-managed host files:

```bash
npx @appautomaton/automaton install --uninstall --codex .
```

## What It Adds

- `.agent/` durable project state and work artifacts
- host skills under `.codex/skills`, `.claude/skills`, or `.opencode/skills`
- host hooks for context injection and status synchronization
- manifest-tracked install files for exact cleanup

Automaton is copy-based: installed skills are local to the target project and can be inspected as plain markdown.

## CLI

```bash
automaton install [--codex|--claude|--opencode|--all] [root]
automaton install --uninstall [--codex|--claude|--opencode|--all] [root]
automaton status [root]
automaton context [frame|plan|execute|verify|resume]
```

## Development

```bash
npm test
npm pack --dry-run
```

The package intentionally ships only `bin/`, `hosts/`, `lib/`, `runtime/`, and `skills/`.
