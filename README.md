# Automaton

[![npm version](https://img.shields.io/npm/v/@appautomaton/automaton.svg)](https://www.npmjs.com/package/@appautomaton/automaton)
[![license](https://img.shields.io/npm/l/@appautomaton/automaton.svg)](https://github.com/appautomaton/automaton/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/@appautomaton/automaton.svg)](https://www.npmjs.com/package/@appautomaton/automaton)

Portable, stage-gated agentic-AI harness for Claude Code, Codex, and OpenCode.

An AI coding agent framework that gives LLM-powered development tools structured workflows for long-running tasks. Automaton installs markdown skills, lightweight runtime hooks, and durable `.agent/` state into a project so agent work survives context window limits, session restarts, and multi-step changes that would otherwise lose coherence.

## Acknowledgement 致谢

🖤🤍💛 Thanks to [Linux Do](https://linux.do/) (https://linux.do/) for their vibrant AI development community. 🖤🤍💛

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

## What It Adds

- `.agent/` durable project state, steering, work artifacts, and runtime files
- host skills under `.codex/skills`, `.claude/skills`, or `.opencode/skills`
- host hooks for context injection and status synchronization
- manifest-tracked install files for exact cleanup

Automaton is copy-based: installed skills are local plain markdown files that can be inspected in the target project.

## Workflow

```text
office-hours -> frame -> product review -> plan -> engineering review -> execute -> verify -> resume
```

Most changes start at `auto-frame`, move through `auto-plan`, then continue with `auto-execute` and `auto-verify`. Use `auto-onboard` when project steering is missing or stale, and `auto-office-hours` when the objective is still too broad.

## Useful Commands

Run package commands through `npx @appautomaton/automaton`:

```bash
npx @appautomaton/automaton status
npx @appautomaton/automaton validate
npx @appautomaton/automaton install --uninstall --codex
```

## Contributor Docs

Design and runtime notes live in [`docs/`](docs/).

## Links

- [npm package](https://www.npmjs.com/package/@appautomaton/automaton)
- [GitHub](https://github.com/appautomaton/automaton)
- [Issues](https://github.com/appautomaton/automaton/issues)

## License

MIT
