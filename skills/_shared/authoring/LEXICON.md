# Lexicon

Canonical vocabulary for Automaton skills. Use these terms exactly. Do not substitute synonyms.

## Change Lifecycle

| Canonical | Anti-patterns | Meaning |
|-----------|---------------|---------|
| change | ticket, issue, story, task | A unit of work tracked by Automaton. Has a name, stage, and artifacts. |
| stage | phase, step | One of `frame`, `plan`, `execute`, `verify`, `verified`, `resume`. Immutable and validated. Roadmap phases (`ROADMAP-CONTRACT.md`) are a separate concept, not a stage synonym; "Phase N" is correct there and only there. Frontmatter may label a non-stage helper `utility` (auto-onboard); the runtime enum never includes it. |
| slice | task, subtask, step | A testable, deliverable chunk of a plan. Ordered and verifiable. |
| artifact | document, file | A markdown file produced by a skill: `SPEC.md`, `DESIGN.md`, `PLAN.md`. |
| steering | project config | Files in `.agent/steering/` that describe project truth: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`. |
| skill folder | skill file | A self-contained directory with `SKILL.md`, `references/`, and optionally `templates/`. |
| references | guides, docs, examples | Lazy-loaded deep content inside a skill folder. Loaded only when needed. |
| scripts | helpers, tools | Shared self-contained `.mjs` files in `.agent/.automaton/scripts/`. Invoked via `bash` tool with `node`. |

## Review Verdicts

| Canonical | Never use | Meaning |
|-----------|-----------|---------|
| approved | pass, OK, good | Direction is sound. Proceed. |
| approved_with_risks | proceed with caution | Direction is sound but carries known risks. Document them. |
| needs_correction | wrong, broken | Direction is flawed. Return to planning. |

## Context and State

| Canonical | Anti-patterns | Meaning |
|-----------|---------------|---------|
| canonical pointer | main file, primary doc | The path in `.agent/.automaton/state/current.json` that points to the authoritative version of an artifact. |
| active change | current work | The change named in `.agent/.automaton/state/current.json` under `active_change`. |
| loading discipline | context budget field, token allocation | Internal guidance for loading only artifacts needed by the current stage or slice. |
| context pressure | time estimate, percent budget | A real stop condition when loaded context risks dropping material state; report only when it blocks continuation. |
| progressive loading | full scan, read everything | Loading only the files needed for the current slice, in dependency order. |
| re-read rule | no-re-read, check again | Default: recall a loaded file from memory. Re-read when it changed, the user asks, verification requires fresh evidence, or recall is uncertain (for example after compaction). |

## Agent Actions

| Canonical | Anti-patterns | Meaning |
|-----------|---------------|---------|
| GATE | important, be careful | An absolute block. The agent must not proceed past this point unless the listed conditions are satisfied. |
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
| content | writing, article, brief | Audience, thesis, voice, content anti-goals, channel, source policy, factual risk, format. |

## Instruction Posture

The harness exists to let the model use its full capability safely, not to fence it in. Hold every instruction to these rules:

- **Restrictions guard boundaries, not capability.** Before writing "do not X", name the boundary it protects: git history, code mutation authorization, user-approved scope, or evidence integrity. If it protects none of these, write an affirmative default instead.
- **GATE and STOP items are conditions, not procedures.** A gate or stop names what must be true or what halts. The response procedure lives in one referenced home, never inline next to "halt immediately".
- **One home per contract.** State a rule once and point to it everywhere else. Tests guard the single home. Restating a contract in two files is not robustness, it is a future contradiction.
- **Never key behavior to quantities the model cannot observe.** No self-measured token counts, percentages, or wall-clock estimates. Key behavior to observable signals (output quality, skipped steps) or to host-reported data, explicitly marked as such.
- **Defaults with named escapes beat hard caps.** "Default budget: 10 files, extend while X remains unidentified and say why" preserves boundedness without capping capability. A bare numeric ceiling does not.

## Prose Standard

Skill prose is read by a strong model under load. Write for that reader:

- No em-dashes. Prefer commas, periods, or a colon; a semicolon only where a period would fragment one thought.
- Complete sentences, plain words, one idea per sentence.
- State every hard rule with its reason in the same breath. A rule that carries its why survives paraphrase and edge cases.
- Principles over checklists. Cut anything a capable model already knows; keep what is project-specific or counter-intuitive.
- Flag slop in clusters, not single instances (`ANTI-SLOP.md`, What Not To Flag).

## Prohibited Phrases

Do not use these in skill instructions. They are too vague to shape behavior.

- "Be careful" → Use `GATE` or `STOP` with explicit conditions.
- "Consider" → Use "Evaluate X against Y" or omit if not required.
- "Think about" → Use "List" or "Compare" or remove.
- "As needed" → Use explicit criteria for when to do something.
- "Best practice" → Use the specific practice and why it matters for this change.
