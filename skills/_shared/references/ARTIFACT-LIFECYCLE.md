# Artifact Lifecycle

Shared contract for what each Automaton stage consumes, writes, records, and hands off. This reference guides skills; it does not add runtime enforcement.

## Invariants

- The only valid stages are `frame`, `plan`, `execute`, `verify`, `verified`, and `resume`.
- The artifact layout remains `.agent/steering/`, `.agent/wiki/`, `.agent/work/<change>/`, and `.agent/.automaton/state/current.json`.
- Canonical pointers live in `.agent/.automaton/state/current.json`.
- `current.json` is the cursor for active change, stage, and canonical artifact paths. Skills update it through `sync-status.mjs`.
- Concrete paths belong in `current.json`, `SPEC.md`, and `PLAN.md`; do not create a separate status prose artifact to mirror them.
- Skills write artifacts only for the active change unless a skill explicitly documents a steering or wiki output.
- Do not add archive behavior here: no archive commands, runtime enforcement, daemons, dashboards, browser workflows, marketplace behavior, or vendor-source imports.

## Progressive Disclosure

`SPEC.md` and `PLAN.md` are canonical indexes, not forced compression targets. For large coherent work, keep canonical files reloadable and link normative detail files instead of narrowing the goal.

Allowed active-change layout:

```text
.agent/work/<change>/INTAKE.md
.agent/work/<change>/SPEC.md
.agent/work/<change>/spec/*.md
.agent/work/<change>/PLAN.md
.agent/work/<change>/slices/*.md
.agent/work/<change>/DESIGN.md
.agent/work/<change>/orchestration/*.md   # conditional: subagent route or complex review loops only
```

- `INTAKE.md` preserves approved office-hours context for `auto-frame`. It is discovered by `active_change`, not by a canonical pointer.
- `SPEC.md` must summarize and link every normative `spec/*.md` detail file. Unlinked supplemental files are notes, not contract.
- `PLAN.md` must link any `slices/*.md` detail file and preserve requirement IDs, gap IDs, invariants, audit questions, migration checkpoints, or coverage targets from SPEC.md.
- Execute and verify load only detail files linked to the active slice or requirement IDs.
- Execute writes slice evidence in place: inline slices update `PLAN.md`; linked detail slices update `slices/slice-NNN.md`; `orchestration/*.md` is supporting evidence, not the default write target.
- Split a change only for independent outcomes. Do not split or narrow one coherent outcome solely because the spec or plan has many files, gaps, constraints, or scenarios.
- If a skill narrows the user's stated scope, it must name the narrowing, explain why, and record the deferred scope in `.agent/steering/ROADMAP.md` following the format in `ROADMAP-CONTRACT.md`, or ask for confirmation.

## Stage Handoffs

| Stage | Required inputs | Produces | State pointer expectations | Next handoff |
| --- | --- | --- | --- | --- |
| `frame` | active change; optional `INTAKE.md` or framing context | `INTAKE.md`, `SPEC.md`, and roadmap update when office-hours approves roadmap scale | office-hours sets `active_change` and `stage: frame`; frame sets `canonical_spec`; `stage` stays `frame` unless plan handoff is approved | `auto-frame`, `auto-ceo-review`, `auto-plan`, or `auto-office-hours` |
| `plan` | `canonical_spec`; optional review sections | `.agent/work/<change>/PLAN.md`; optional `DESIGN.md` | `canonical_plan` points to PLAN.md; `canonical_design` only when DESIGN.md exists; `stage` becomes `plan` | `auto-eng-review` or `auto-execute` |
| `execute` | approved PLAN.md, current slice, acceptance criteria, verification commands | code/docs/tests plus PLAN-required slice evidence | auto-execute sets `stage: execute` after `canonical_plan` resolves and before changes; do not change canonical pointers to missing files; do not add slice cursor state | re-enter `auto-execute` for remaining slices unless blocked; continue into `auto-verify`'s contract when all slices complete and no checkpoint, STOP condition, context pressure, or host limitation blocks continuation |
| `verify` | canonical PLAN.md, executed slices, verification commands | verification report; `VERIFY-GAP` annotations in PLAN.md on failure | auto-verify sets `stage: verify` after `canonical_plan` resolves and before commands; failure returns state to `stage: execute` | `auto-execute` on fail; `verified` on pass |
| `verified` | canonical PLAN.md and verification evidence | completed change summary; roadmap phase marked done when applicable | `stage: verified` set only on full verification pass | no next lifecycle skill; may mention `auto-office-hours` only as a new-objective entry point |
| `resume` | current state and canonical artifact pointers | concise recovery summary and next recommended skill | does not invent missing pointers; stale pointers are reported, not silently repaired | the skill matching recovered state |

## Handoff Contract

Lifecycle stages hand off through five durable elements. Skills recommend, prepare, or continue into the next stage when the same session can safely do so. `stage: verified` is terminal for the active change; any `auto-office-hours` mention is for a new objective, not a same-change handoff.

Seamless continuation is not mandatory nested skill invocation. A clean continuation should not force the user to manually invoke the next lifecycle skill, but direct user/host invocation remains valid. Do not invent a universal Skill tool or hidden dispatcher. Continue only after the exit gate is satisfied; otherwise stop with the blocker and next action.

1. **Exit gate** — condition required to advance.
2. **Artifacts produced or updated** — files written for the active change.
3. **State mutation** — `current.json` fields changed through `sync-status.mjs`: `stage`, canonical pointers, or review verdicts.
4. **Diagnostic handling** — `error` diagnostics block advancement; `warning` diagnostics surface to the next stage.
5. **Next-stage recommendation, blocker, or completion note** — what to invoke next, what blocks progress, or that the active change is complete.

## Review Verdict Routing

`auto-ceo-review` and `auto-eng-review` are optional lifecycle checks, not stage prerequisites. Use them when product direction or execution safety needs review. Downstream skills must respect any review verdict in `current.json`.

Product review may descope or re-scope; engineering review blocks execution safety only.

| Review | Verdict | Next skill |
| --- | --- | --- |
| `auto-ceo-review` | `approved` | `auto-plan` |
| `auto-ceo-review` | `approved_with_risks` | `auto-plan` (risks must appear in plan) |
| `auto-ceo-review` | `needs_clarification` | `auto-frame` or `auto-office-hours` |
| `auto-ceo-review` | `descoped` | `auto-office-hours` or stop |
| `auto-eng-review` | `approved` | `auto-execute` |
| `auto-eng-review` | `approved_with_risks` | `auto-execute` (risks surfaced before each slice) |
| `auto-eng-review` | `needs_correction` | `auto-plan` |

## STOP Conditions

Halt and report when:

- `canonical_spec` is required but missing or unreadable.
- `canonical_plan` is required but missing or unreadable.
- `canonical_design` is set but the file is missing; report it and continue only when the active skill says DESIGN.md is optional.
- A stage is asked to consume a future-stage artifact.
- The requested work would add archive behavior, runtime lifecycle enforcement, daemons, dashboards, browser workflows, marketplace behavior, or vendor-source imports without a new SPEC.

## Validation Tiers

Validation has three tiers. Keep each check at the lowest tier that catches the failure; do not promote artifact-shape or norm checks into runtime.

| Tier | Scope | Enforced by | Example |
| --- | --- | --- | --- |
| **L1 Coordination** | Cross-skill state invariants | `runtime/lib/validate.mjs`; `error`-level diagnostic; hard stop | Stage enum, canonical pointer resolves to an existing file |
| **L2 Artifact shape** | A single artifact's downstream consumability | Next skill reads upstream artifact and surfaces a `warning`-level diagnostic | SPEC.md has Acceptance Criteria; PLAN.md slices have verification commands |
| **L3 Norms** | Wording, structure, prose quality | Prompt text + `tests/skills.test.mjs` regression coverage | Bounded goal is one sentence; lifecycle skills avoid mandatory nested invocation |

Runtime stays portable across Claude, Codex, and OpenCode by holding only L1 checks. L2 lives where artifacts are consumed. L3 lives in prompts and regression tests.

## Artifact Signal Discipline

Automaton artifacts are read by future skills and humans. Every section must change a downstream decision.

1. **No mirror sections** — One concept per section. If two sections answer the same question, delete one or reframe them.
2. **Index over transcript** — Aggregate tables (traceability, verification rollups, slice summaries) earn their place only at ≥ 3 entries. For 1–2 entries, inline the information where it is used.
3. **Core versus conditional sections** — Lifecycle SKILL.md required-section lists distinguish core (always present) from conditional (include only when the named trigger applies). Each conditional section names its trigger.
4. **Append-replace, not stack** — Review sections on artifacts are replaced on re-run for the same change, not stacked. Do not accumulate multiple `## Review: Product` or `## Review: Engineering` blocks.
5. **Inline default for transient reports** — Verification reports, status summaries, and intermediate audit output live in the conversation only. Write to disk only when a future skill or human will read it again.

**Deletion test for any section:** if this section were removed, what downstream skill or human loses information? If nothing, drop it.
