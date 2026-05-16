# Artifact Lifecycle

This reference defines the artifact handoff contract for Automaton skills. It clarifies what each stage consumes, produces, records, and hands off. It does not add runtime enforcement.

## Invariants

- The only valid stages are `frame`, `plan`, `execute`, `verify`, and `resume`.
- The artifact layout remains `.agent/steering/`, `.agent/wiki/`, `.agent/work/<change>/`, and `.agent/.automaton/state/current.json`.
- Canonical pointers live in `.agent/.automaton/state/current.json`.
- `current.json` is the cursor for active change, stage, and canonical artifact paths. `STATUS.md` is a compact human summary, not a pointer registry.
- Do not duplicate canonical SPEC, DESIGN, PLAN, or linked detail-file paths in `STATUS.md`. Concrete paths belong in `current.json`, `SPEC.md`, and `PLAN.md`; status prose may name artifact roles such as "current spec" or "active slice."
- Skills write artifacts only for the active change unless a skill explicitly documents a steering or wiki output.
- Do not add archive behavior here. Do not add archive commands, runtime enforcement, daemons, dashboards, browser workflows, marketplace behavior, or vendor-source imports.

## Progressive Disclosure

`SPEC.md` and `PLAN.md` are canonical indexes, not forced compression targets. Large coherent work should keep the canonical files reloadable and link detail files instead of silently narrowing the goal.

Allowed active-change layout:

```text
.agent/work/<change>/INTAKE.md
.agent/work/<change>/SPEC.md
.agent/work/<change>/spec/*.md
.agent/work/<change>/PLAN.md
.agent/work/<change>/slices/*.md
.agent/work/<change>/DESIGN.md
```

Rules:
- `INTAKE.md` preserves approved office-hours context for `auto-frame`. It is discovered by `active_change`, not by a canonical pointer.
- `SPEC.md` must summarize and link every normative `spec/*.md` detail file. Unlinked supplemental files are notes, not contract.
- `PLAN.md` must link any `slices/*.md` detail file and preserve requirement IDs, gap IDs, invariants, audit questions, migration checkpoints, or coverage targets from SPEC.md.
- Execute and verify load only the detail files linked for the active slice or active requirement IDs.
- Split a change only for independent outcomes. Do not split or narrow one coherent outcome solely because the spec or plan has many files, gaps, constraints, or scenarios.
- If a skill narrows the user's stated scope, it must name the narrowing, explain why, and record the deferred scope in `.agent/steering/ROADMAP.md` following the format in `ROADMAP-CONTRACT.md`, or ask for confirmation.

## Stage Handoffs

| Stage | Required inputs | Produces | State pointer expectations | Next handoff |
| --- | --- | --- | --- | --- |
| `frame` | active change, steering status, optional `INTAKE.md` or framing context | `.agent/work/<change>/INTAKE.md` from office-hours; `.agent/work/<change>/SPEC.md` from frame; `.agent/steering/ROADMAP.md` update from office-hours when scale is roadmap | office-hours sets `active_change` and `stage: frame`; frame sets `canonical_spec`; `stage` remains `frame` unless the user explicitly approves plan handoff | `auto-frame`, `auto-ceo-review`, `auto-plan`, or `auto-office-hours` |
| `plan` | `canonical_spec`, steering status, optional review sections | `.agent/work/<change>/PLAN.md`; optional `DESIGN.md` | `canonical_plan` points to PLAN.md; `canonical_design` is set only when DESIGN.md exists; `stage` becomes `plan` | `auto-eng-review` or `auto-execute` |
| `execute` | approved PLAN.md, current slice, acceptance criteria, verification commands | code, docs, tests, orchestration notes, and slice evidence required by PLAN.md | state advances only after evidence exists; do not change canonical pointers to missing files | `auto-execute` for remaining slices or `auto-verify` when implementation is ready to check |
| `verify` | canonical PLAN.md, all slices executed, verification commands | verification report; `VERIFY-GAP` annotations in PLAN.md on failure | `stage: verify` set only on full pass; failed verification keeps state unchanged | `auto-resume` on pass (change complete), `auto-execute` on fail (gap annotations in PLAN.md) |
| `resume` | current state, STATUS.md, canonical artifact pointers | concise recovery summary and next recommended skill | does not invent missing pointers; stale pointers are reported, not silently repaired | the skill matching recovered state |

## Review Verdict Routing

`auto-ceo-review` and `auto-eng-review` use different verdict vocabularies because they answer different questions. Product review may **descope or re-scope** (4 verdicts; "send back for clarification" is distinct from "kill"). Engineering review only blocks **execution safety** (3 verdicts; re-planning subsumes both unsafe-architecture and unsafe-routing).

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

Halt and report instead of continuing when:

- `canonical_spec` is required but missing or unreadable.
- `canonical_plan` is required but missing or unreadable.
- `canonical_design` is set but the file is missing; report it and continue only when the active skill says DESIGN.md is optional.
- `STATUS.md` and `.agent/.automaton/state/current.json` disagree on active change or stage.
- A stage is asked to consume an artifact from a future stage.
- The requested work would add archive behavior, runtime lifecycle enforcement, daemons, dashboards, browser workflows, marketplace behavior, or vendor-source imports without a new SPEC.
