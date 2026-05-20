# Automaton

Portable, stage-gated agentic-AI harness for Claude Code, Codex, and OpenCode.

Automaton installs a small set of markdown skills plus runtime hooks into a project. The workflow is:

```text
office-hours -> frame -> plan -> engineering review -> execute -> verify -> resume
```

## How To Use It

Use Automaton when work should survive context loss, hand off between agents, or move through clear gates instead of a single long prompt.

| Concept | Role |
| --- | --- |
| `.agent/.automaton/state/current.json` | Machine cursor: active change, stage, and canonical artifact pointers. |
| `.agent/steering/` | Durable project steering: project truth, requirements, roadmap, status. |
| `.agent/work/<change>/SPEC.md` | Current change contract. Planning depends on this. |
| `.agent/work/<change>/PLAN.md` | Ordered execution slices and verification commands. Execution depends on this. |
| `.agent/steering/ROADMAP.md` | Optional future-work guide. It is not runtime state. |

## Skills

| Skill | Use When | Produces / Updates |
| --- | --- | --- |
| `auto-onboard` | Steering is missing or stale. | Project truth in `.agent/steering/` and `.agent/wiki/`. |
| `auto-office-hours` | The goal is vague, too large, or needs decomposition. | Approved intake; optional roadmap decomposition. |
| `auto-frame` | The objective is clear enough to turn into a contract. | `SPEC.md` and `canonical_spec`. |
| `auto-ceo-review` | A framed spec needs product go/no-go. | Product review verdict on the spec. |
| `auto-plan` | A spec is accepted and needs executable slices. | `PLAN.md`, optional `DESIGN.md`, and `canonical_plan`. |
| `auto-eng-review` | A plan needs engineering go/no-go. | Engineering review verdict on the plan. |
| `auto-execute` | The plan is approved and slices should be implemented. | Slice changes, evidence, and verification handoff. |
| `auto-verify` | All slices are executed and acceptance criteria need proof. | Verification report; marks roadmap phase done when matched. |
| `auto-resume` | A fresh session needs to recover current work. | Recovery summary and next action from artifacts. |

Typical flow:

```text
auto-onboard        # once per project, or when steering is stale
auto-office-hours   # only when the request is vague or roadmap-sized
auto-frame          # always writes SPEC.md for the active change
auto-plan           # writes PLAN.md slices
auto-execute        # implements slices, then continues to verify when safe
auto-verify         # closes the change on pass
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
