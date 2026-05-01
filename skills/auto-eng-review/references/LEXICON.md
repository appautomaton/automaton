# Lexicon

Canonical vocabulary for Automaton skills. Use these terms exactly. Do not substitute synonyms.

## Change Lifecycle

| Canonical | Anti-patterns | Meaning |
|-----------|---------------|---------|
| change | ticket, issue, story, task | A unit of work tracked by Automaton. Has a name, stage, and artifacts. |
| stage | phase, step | One of `frame`, `plan`, `execute`, `verify`, `resume`. Immutable and validated. |
| slice | task, subtask, step | A testable, deliverable chunk of a plan. Ordered and verifiable. |
| artifact | document, file | A markdown file produced by a skill: `SPEC.md`, `DESIGN.md`, `PLAN.md`, `VERIFY.md`. |
| steering | project config | Files in `.agent/steering/` that describe project truth: `PROJECT.md`, `STATUS.md`, `REQUIREMENTS.md`, `ROADMAP.md`. |
| skill folder | skill file | A self-contained directory with `SKILL.md`, `references/`, `scripts/`, and optionally `templates/`. |
| references | guides, docs, examples | Lazy-loaded deep content inside a skill folder. Loaded only when needed. |
| scripts | helpers, tools | Self-contained `.mjs` files inside a skill folder. Invoked via `bash` tool with `node`. |

## Review Verdicts

| Canonical | Never use | Meaning |
|-----------|-----------|---------|
| approved | pass, OK, good | Direction is sound. Proceed. |
| approved_with_risks | proceed with caution | Direction is sound but carries known risks. Document them. |
| needs_clarification | unclear, vague | Direction cannot be evaluated. Return to framing. |
| needs_correction | wrong, broken | Direction is flawed. Return to planning. |
| descoped | reject, cancel | Direction is out of scope or low-leverage. Do not pursue. |

## Context and State

| Canonical | Anti-patterns | Meaning |
|-----------|---------------|---------|
| canonical pointer | main file, primary doc | The path in `.agent/.automaton/state/current.json` that points to the authoritative version of an artifact. |
| active change | current work | The change named in `.agent/.automaton/state/current.json` under `active_change`. |
| context budget | time estimate, complexity | Framing work in terms of context-window consumption, not duration. |
| progressive loading | full scan, read everything | Loading only the files needed for the current slice, in dependency order. |
| no-re-read | re-read, check again | A rule: do not re-read a file already loaded in this session unless it changed, the user asks, or verification requires fresh evidence. |

## Agent Actions

| Canonical | Anti-patterns | Meaning |
|-----------|---------------|---------|
| HARD-GATE | important, be careful | An absolute block. The agent must not proceed past this point unless the listed conditions are satisfied. |
| STOP | pause, wait | A condition where the agent halts and reports, rather than guessing or proceeding. |
| surface | mention, note | To call out a risk or finding explicitly to the user. |
| reframe | redirect, change topic | To return to an earlier stage when the current direction is no longer valid. |

## Lenses

| Canonical | Never use | Scope |
|-----------|-----------|-------|
| product | business, user | Value proposition, differentiation, scope, anti-goals. |
| engineering | tech, code | Architecture, data flow, edge cases, tests, dependencies. |
| design | UI, UX | Interaction, visual, information architecture. |
| security | auth, safety | Threat model, attack surface, secrets, compliance. |
| runtime | ops, deploy | Performance, observability, infrastructure, cost. |

## Prohibited Phrases

Do not use these in skill instructions. They are too vague to shape behavior.

- "Be careful" → Use `HARD-GATE` or `STOP` with explicit conditions.
- "Consider" → Use "Evaluate X against Y" or omit if not required.
- "Think about" → Use "List" or "Compare" or remove.
- "As needed" → Use explicit criteria for when to do something.
- "Best practice" → Use the specific practice and why it matters for this change.
