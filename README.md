# Automaton

[![npm version](https://img.shields.io/npm/v/@appautomaton/automaton.svg)](https://www.npmjs.com/package/@appautomaton/automaton)
[![license](https://img.shields.io/npm/l/@appautomaton/automaton.svg)](https://github.com/appautomaton/automaton/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/@appautomaton/automaton.svg)](https://www.npmjs.com/package/@appautomaton/automaton)
[![site](https://github.com/appautomaton/automaton/actions/workflows/pages.yml/badge.svg)](https://appautomaton.github.io/automaton/)

Portable, stage-gated agentic-AI harness for Claude Code, Codex, and OpenCode.

An AI coding agent framework that gives LLM-powered development tools structured workflows for long-running tasks. Automaton installs markdown skills, lightweight startup integrations, and durable `.agent/` state into a project so agent work survives context window limits, session restarts, and multi-step changes that would otherwise lose coherence.

## Why Use It

- Keep project truth, current work, and handoff state outside the chat window.
- Move larger changes through explicit frame, plan, execute, and verify stages.
- Use the same workflow across Claude Code, Codex, and OpenCode.

## Install

Run from the project you want to equip:

```bash
npx @appautomaton/automaton install --codex
npx @appautomaton/automaton install --claude
npx @appautomaton/automaton install --opencode
```

Install all supported host surfaces:

```bash
npx @appautomaton/automaton install --all
```

The target root is optional and defaults to the current directory. To install into another project, pass its path as the final argument.

Host flags pick what to install: `--claude`, `--codex`, `--opencode`, or `--all`. Without a host flag, `install` prepares only the shared `.agent` runtime and prints a note saying so. The default runs the other way on removal: `install --uninstall` without a host flag removes every installed host plus the shared runtime, while `.agent` project history is always preserved.

## What It Adds

- `.agent/` durable project state, steering, work artifacts, and runtime files
- host skills under `.codex/skills`, `.claude/skills`, or `.opencode/skills`
- host hooks/plugins for context injection

Automaton is copy-based: installed skills are local plain markdown files that are refreshed from source on reinstall and can be inspected in the target project.

## Workflow

```text
office-hours -> frame -> plan -> engineering review (optional) -> execute -> verify -> verified
```

The user approving `SPEC.md` at frame's exit is the product review; no model gate stands in for product judgment.

Most changes start at `auto-frame`, move through `auto-plan`, then continue with `auto-execute` and `auto-verify`. A full verification pass closes the change as `verified` (terminal). Use `auto-onboard` when project steering is missing or stale, `auto-office-hours` when the objective is still too broad, and `auto-resume` to re-enter existing work from a fresh session at any point.

## Useful Commands

Run package commands through `npx @appautomaton/automaton`:

```bash
npx @appautomaton/automaton status
npx @appautomaton/automaton validate
npx @appautomaton/automaton install --uninstall --codex
```

`status` also warns when installed copies drift from the CLI source: a missing install receipt, a version skew, or an orphaned skill a newer version removed.

## Contributor Docs

Contributor-only design and runtime notes live in the repository [`docs/`](docs/) directory; they are not included in the npm package payload.

## Links

- [Site](https://appautomaton.github.io/automaton/): the operating model in one scroll
- [npm package](https://www.npmjs.com/package/@appautomaton/automaton)
- [GitHub](https://github.com/appautomaton/automaton)
- [Issues](https://github.com/appautomaton/automaton/issues)

## Acknowledgement

🖤🤍💛 Thanks to [Linux Do](https://linux.do/) for their vibrant AI development community. 🖤🤍💛

## License

MIT
