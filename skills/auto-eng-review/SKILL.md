---
name: auto-eng-review
description: Engineering go/no-go on a plan. Use after auto-plan, before execution.
metadata:
  stage: plan
---

# auto-eng-review

Engineering-safety gate. Validates that a plan is safe to execute before implementation begins.

First action: run `scripts/get-context.mjs` → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding. Read `PLAN.md`; read `DESIGN.md` only when `canonical_design` is set and resolves to a file.

## Preamble

Execution safety review. Architecture, data flow, edge cases, test strategy, not product vision. Identifies risks that could cause failure, stalling, or rework.

Context budget: one PLAN.md read, optional DESIGN.md when `canonical_design` exists, one risk matrix, one verdict. Read source files when assessing technical risk — slice boundaries, dependency assumptions, and blast radius claims are only verifiable against the actual code.

## Quality Gate

Before appending the engineering review:
- Ground concerns in slices, file areas, commands, or missing artifacts.
- Separate blockers from follow-up cleanup.
- Avoid reopening product scope unless the plan is unbuildable.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when findings are generic or unactionable.

## Do

### Load State

Read `.agent/steering/STATUS.md`. Read the canonical `PLAN.md`. If `canonical_design` is null, missing, or points to a missing file, continue without DESIGN.md and note that the plan intentionally has no design artifact.

### Restate the Plan

In engineering terms: what is being built, what systems does it touch, and what is the critical path?

### Evaluate Risks

For each dimension, rate 0–10 and explain what a 10 looks like.

<RISK-MATRIX>

| Dimension | Rating (0–10) | What a 10 looks like |
|-----------|---------------|----------------------|
| Architecture fit | | Clean integration, no hacks, follows existing patterns |
| Data flow clarity | | Every input, transform, and output is traceable |
| Edge case coverage | | Failure modes are enumerated and handled |
| Test strategy | | Tests are specified before code, not after |
| Rollback safety | | Can revert without data loss or downtime |
| Dependency risk | | No new critical dependencies; existing ones are stable |

A score ≤ 3 in any dimension is a blocking concern. Surface it explicitly.
</RISK-MATRIX>

### Render Verdict

Use exactly one of the three approved values.

<VERDICT>

Use strict vocabulary. No synonyms.

| Verdict | Meaning | Next Action |
|---------|---------|-------------|
| `approved` | Implementation is safe to proceed. | `auto-execute` |
| `approved_with_risks` | Implementation is safe but carries known risks. Document them. | `auto-execute` |
| `needs_correction` | Plan is flawed or unsafe. Return to planning. | `auto-plan` |
</VERDICT>

### Append Review

Add a `## Review: Engineering` section to `PLAN.md` using the exact template in `references/review-template.md`.

### Update State

Run `sync-status.mjs` from this skill's installed directory.
Update `.agent/.automaton/state/current.json`:
- `engineering_review` → `<verdict>`

### Recommend

State the next skill based on the verdict.

## Output

- `PLAN.md` with appended `## Review: Engineering` section
- `.agent/.automaton/state/current.json` updated with `engineering_review`; `stage` is unchanged by this skill
- Diagnostic handling: `error`-level diagnostics block the review; `warning`-level diagnostics surface to the next stage
- Recommended next skill, mapped from verdict per the Review Verdict Routing table in `references/ARTIFACT-LIFECYCLE.md`: `approved` or `approved_with_risks` → `auto-execute`; `needs_correction` → `auto-plan`. The user or host invokes the next skill; auto-eng-review does not require nested invocation.

## Rules

- Focus on execution safety, not product vision.
- Prefer specific engineering objections over generic caution.
- Do not broaden scope just to feel thorough.
- Verdict vocabulary is strict. Use only the three approved values.
- If the plan is missing or unreadable, verdict is `needs_correction`. Do not guess.
- Missing DESIGN.md is not a blocker when `canonical_design` is null, absent, or intentionally skipped by the plan.

## Deep

### Review Template

Read `references/review-template.md` for the exact markdown format. (~21 lines: 5-field format covering verdict/strength/concern/action/verified, with rules on sentence limits and no extra commentary.)

### Risk Matrix Examples

Read `references/risk-examples.md` for sample risk matrices. (~40 lines: 3 scored examples: API migration → approved_with_risks, new external service → needs_correction, refactor → approved.)

### Engineering Prime Directives

Read `references/prime-directives.md` for 9 non-negotiable standards and preferences. (~35 lines: 9 standards from zero-silent-failures to scrap-it permission; engineering preferences section covering DRY, testing, observability, security, deployment.)

### Engineering Review Sections

Read `references/engineering-sections.md` for the 11-section methodology. (~160 lines: architecture, error/rescue map, security/threat model, data flow/interaction edge cases, code quality, test review, performance, observability, deployment/rollout, long-term trajectory, design/UX. Each section has specific checks and required ASCII diagrams.)

### Implementation Alternatives

Read `references/implementation-alternatives.md` for the mandatory 2-3 approach comparison. (~25 lines: APPROACH format template with Summary/Effort/Risk/Pros/Cons/Reuses; rules requiring minimal-viable + ideal-architecture variants.)
