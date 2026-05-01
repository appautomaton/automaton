# Artifact Lifecycle

This reference defines the artifact handoff contract for Automaton skills. It clarifies what each stage consumes, produces, records, and hands off. It does not add runtime enforcement.

## Invariants

- The only valid stages are `frame`, `plan`, `execute`, `verify`, and `resume`.
- The artifact layout remains `.agent/steering/`, `.agent/wiki/`, `.agent/work/<change>/`, and `.agent/.automaton/state/current.json`.
- Canonical pointers live in `.agent/.automaton/state/current.json`.
- Skills write artifacts only for the active change unless a skill explicitly documents a steering or wiki output.
- Do not add archive behavior here. Do not add archive commands, runtime enforcement, daemons, dashboards, browser workflows, marketplace behavior, or vendor-source imports.

## Stage Handoffs

| Stage | Required inputs | Produces | State pointer expectations | Next handoff |
| --- | --- | --- | --- | --- |
| `frame` | active change, steering status, framing context | `.agent/work/<change>/SPEC.md` | `canonical_spec` points to SPEC.md; `stage` remains `frame` unless the user explicitly approves plan handoff | `auto-ceo-review`, `auto-plan`, or `auto-office-hours` |
| `plan` | `canonical_spec`, steering status, optional review sections | `.agent/work/<change>/PLAN.md`; optional `DESIGN.md` | `canonical_plan` points to PLAN.md; `canonical_design` is set only when DESIGN.md exists; `stage` becomes `plan` | `auto-eng-review` or `auto-execute` |
| `execute` | approved PLAN.md, current slice, acceptance criteria, verification commands | code, docs, tests, orchestration notes, and slice evidence required by PLAN.md | state advances only after evidence exists; do not change canonical pointers to missing files | `auto-execute` for remaining slices or `auto-verify` when implementation is ready to check |
| `verify` | canonical PLAN.md, current slice or completed work, verification commands | verification report inline or `VERIFY.md` for important changes | state advances only when all criteria pass; failed verification keeps state unchanged | `auto-execute` for gaps, `auto-resume` for continuation, or completion status |
| `resume` | current state, STATUS.md, canonical artifact pointers | concise recovery summary and next recommended skill | does not invent missing pointers; stale pointers are reported, not silently repaired | the skill matching recovered state |

## STOP Conditions

Halt and report instead of continuing when:

- `canonical_spec` is required but missing or unreadable.
- `canonical_plan` is required but missing or unreadable.
- `canonical_design` is set but the file is missing; report it and continue only when the active skill says DESIGN.md is optional.
- `STATUS.md` and `.agent/.automaton/state/current.json` disagree on active change or stage.
- A stage is asked to consume an artifact from a future stage.
- The requested work would add archive behavior, runtime lifecycle enforcement, daemons, dashboards, browser workflows, marketplace behavior, or vendor-source imports without a new SPEC.
