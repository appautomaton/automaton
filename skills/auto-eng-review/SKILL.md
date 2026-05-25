---
name: auto-eng-review
description: Optional engineering go/no-go on a plan. Use when execution safety needs review before implementation.
metadata:
  stage: plan
---

# auto-eng-review

Optional engineering-safety review. Validates that a plan is safe to execute before implementation begins.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root. If the command fails, briefly troubleshoot the invocation or runtime path. If it runs and returns error diagnostics, report them and stop before writing artifacts. Then read `PLAN.md`; read `DESIGN.md` only when `canonical_design` is set and resolves to a file.

## Preamble

Execution safety review. Architecture, data flow, edge cases, test strategy, not product vision. It does not modify the plan or reopen product scope. Identifies risks that could cause failure, stalling, or rework.

Loading discipline: one PLAN.md read, optional DESIGN.md when `canonical_design` exists, one risk matrix, one verdict. Read source files when assessing technical risk — slice boundaries, dependency assumptions, and blast radius claims are only verifiable against the actual code.

## Quality Gate

Before appending the engineering review:
- Ground concerns in slices, file areas, commands, or missing artifacts.
- Separate blockers from follow-up cleanup.
- Avoid reopening product scope unless the plan is unbuildable.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when findings are generic or unactionable.

## Do

### Load State

Read the canonical `PLAN.md`. If `canonical_design` is null, missing, or points to a missing file, continue without DESIGN.md and note that the plan intentionally has no design artifact.

### Restate the Plan

In engineering terms: what is being built, what systems does it touch, and what is the critical path?

### Evaluate Risks

Use this matrix as an internal checklist. In chat, summarize only the verdict-driving dimensions unless the user asks for the full matrix.

### Risk Matrix

| Dimension | Rating (0–10) | What a 10 looks like |
|-----------|---------------|----------------------|
| Architecture fit | | Clean integration, no hacks, follows existing patterns |
| Data flow clarity | | Every input, transform, and output is traceable |
| Edge case coverage | | Failure modes are enumerated and handled |
| Test strategy | | Tests are specified before code, not after |
| Rollback safety | | Can revert without data loss or downtime |
| Dependency risk | | No new critical dependencies; existing ones are stable |

A score ≤ 3 in any dimension is a blocking concern. Surface it explicitly.

### Render Verdict

Use exactly one of the three approved values.

### Verdict Values

Use strict vocabulary. No synonyms.

| Verdict | Meaning | Next Action |
|---------|---------|-------------|
| `approved` | Implementation is safe to proceed. | `auto-execute` |
| `approved_with_risks` | Implementation is safe but carries known risks. Document them. | `auto-execute` |
| `needs_correction` | Plan is flawed or unsafe. Return to planning. | `auto-plan` |

### Append Review

Add a `## Review: Engineering` section to `PLAN.md` using the exact template in `references/review-template.md`.

### Update State

Run `node .agent/.automaton/scripts/sync-status.mjs --engineering-review "<verdict>"` from the project root. Do not edit `current.json` by hand.

### Recommend

State the next skill based on the verdict.

## Output

- `PLAN.md` with appended `## Review: Engineering` section
- `.agent/.automaton/state/current.json` updated through `sync-status.mjs` with `engineering_review`; `stage` is unchanged by this skill
- Diagnostic handling: `error`-level diagnostics block the review; `warning`-level diagnostics surface to the next stage
- Recommended next skill, mapped from verdict: `approved` or `approved_with_risks` → `auto-execute`; `needs_correction` → `auto-plan`. The user or host invokes the next skill; auto-eng-review does not chain.

## Rules

- Focus on execution safety, not product vision.
- Prefer specific engineering objections over generic caution.
- Do not broaden scope just to feel thorough.
- Do not emit the full risk matrix when all dimensions are acceptable; keep the durable review to the 5-field template.
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

Read `references/engineering-sections.md` only when the plan carries non-trivial engineering risk. (~160 lines: trigger-based checks for architecture, error/rescue map, security/threat model, data flow/interaction edge cases, code quality, test review, performance, observability, deployment/rollout, long-term trajectory, design/UX.)

### Implementation Alternatives

Read `references/implementation-alternatives.md` only when PLAN.md lacks an approach rationale, the user asks for alternatives, or the review verdict depends on comparing safer execution paths. (~25 lines: compact APPROACH format.)
