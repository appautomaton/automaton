---
name: auto-eng-review
description: Evaluate whether a plan is safe to execute. Use after auto-plan when the engineering approach needs validation before implementation begins.
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: plan
  role: execution-review
---

# auto-eng-review

Evaluate whether a plan is safe to execute. Use after auto-plan when the engineering approach needs validation before implementation begins.

First action: run `scripts/get-context.mjs` from this skill's installed directory to load active change, stage, `canonical_plan`, and `canonical_design`. Read `PLAN.md`; read `DESIGN.md` only when `canonical_design` is set and resolves to a file.

## Preamble

This skill is an execution safety review. It focuses on architecture, data flow, edge cases, and test strategy — not product vision. It identifies risks that could cause the implementation to fail, stall, or require rework.

Context budget: one read of PLAN.md, one optional read of DESIGN.md when `canonical_design` exists, one risk matrix, one verdict.

## Quality Gate

Before appending the engineering review:
- Ground concerns in slices, file areas, commands, or missing artifacts.
- Separate blockers from follow-up cleanup.
- Avoid reopening product scope unless the plan is unbuildable.
- Read `references/quality.md` if findings are generic or unactionable.

## Do

1. **Load state.** Read `.agent/steering/STATUS.md`. Read the canonical `PLAN.md`. If `canonical_design` is null, missing, or points to a missing file, continue without DESIGN.md and note that the plan intentionally has no design artifact.

2. **Restate the slice.** In engineering terms: what is being built, what systems does it touch, and what is the critical path?

3. **Evaluate risks.** For each dimension, rate 0–10 and explain what a 10 looks like.

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

4. **Render verdict.** Use exactly one of the three approved values.

<VERDICT>

Use strict vocabulary. No synonyms.

| Verdict | Meaning | Next Action |
|---------|---------|-------------|
| `approved` | Implementation is safe to proceed. | `auto-execute` |
| `approved_with_risks` | Implementation is safe but carries known risks. Document them. | `auto-execute` |
| `needs_correction` | Plan is flawed or unsafe. Return to planning. | `auto-plan` |
</VERDICT>

5. **Append review.** Add a `## Review: Engineering` section to `PLAN.md` using the exact template in `references/review-template.md`.

6. **Update state.** Run this skill's installed `sync-status.mjs` from the same host skill root. Update `.agent/.automaton/state/current.json` with `engineering_review: <verdict>`.

7. **Recommend.** State the next skill based on the verdict.

## Output

- `PLAN.md` with appended `## Review: Engineering` section
- `.agent/.automaton/state/current.json` updated with `engineering_review`
- Recommended next skill

## Rules

- Focus on execution safety, not product vision.
- Prefer specific engineering objections over generic caution.
- Do not broaden scope just to feel thorough.
- Verdict vocabulary is strict. Use only the three approved values.
- If the plan is missing or unreadable, verdict is `needs_correction` — do not guess.
- Missing DESIGN.md is not a blocker when `canonical_design` is null, absent, or intentionally skipped by the plan.

## Deep

### Review Template

Read `references/review-template.md` for the exact markdown format.

### Risk Matrix Examples

Read `references/risk-examples.md` for sample risk matrices from past reviews.

### Engineering Prime Directives

Read `references/prime-directives.md` for the 9 non-negotiable standards and engineering preferences.

### Engineering Review Sections

Read `references/engineering-sections.md` for the 11-section review methodology (architecture, error/rescue, security, data flow, code quality, test, performance, observability, deployment, long-term, design).

### Implementation Alternatives

Read `references/implementation-alternatives.md` for the mandatory 2-3 approach comparison format.
