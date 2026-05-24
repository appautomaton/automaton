---
name: auto-ceo-review
description: Product go/no-go on a framed spec. Use after auto-frame, before planning.
metadata:
  stage: frame
---

# auto-ceo-review

Product-direction gate. Decides whether a spec is worth building before planning begins.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding.

## Preamble

Product bet review. Restates the objective as one crisp bet, identifies differentiation, calls out generic or mis-scoped direction. Does not design implementation or write code.

Loading discipline: one SPEC.md read, one review paragraph, one verdict. Read project files when understanding the codebase helps ground the review — verify that spec claims reflect what actually exists before approving or rejecting.

## Quality Gate

Before appending the product review:
- Replace strategic filler with user, action, value, and risk.
- Separate supported claims from assumptions.
- Name the strongest risk even when approving.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when the review sounds like polite validation.

## Do

### Load State

Read `.agent/steering/STATUS.md`. Read the canonical `SPEC.md`.

### Restate the Bet

In one sentence: "We are betting that [specific user] will [specific action] because [specific reason], and the risk is [specific risk]."

### Evaluate

Assess differentiation, user value, generic or mis-scoped elements, and shippability. Ground each in evidence from the spec.

### Render Verdict

Use exactly one of the four approved values.

### Verdict Values

Use strict vocabulary. No synonyms.

| Verdict | Meaning | Next Action |
|---------|---------|-------------|
| `approved` | Direction is sound. Proceed to planning. | `auto-plan` |
| `approved_with_risks` | Direction is sound but carries known risks. Document them in the review. | `auto-plan` |
| `needs_clarification` | Direction cannot be evaluated. Return to framing. | `auto-frame` or `auto-office-hours` |
| `descoped` | Direction is out of scope or low-leverage. Do not pursue. | `auto-office-hours` or stop |

### Append Review

Add a `## Review: Product` section to `SPEC.md` using the exact template in `references/review-template.md`.

### Update State

Run `node .agent/.automaton/scripts/sync-status.mjs` from the project root.
Update `.agent/.automaton/state/current.json`:
- `product_review` → `<verdict>`

### Recommend

State the next skill based on the verdict.

## Output

- `SPEC.md` with appended `## Review: Product` section
- `.agent/.automaton/state/current.json` updated with `product_review`; `stage` is unchanged by this skill
- Diagnostic handling: `error`-level diagnostics block the review; `warning`-level diagnostics surface to the next stage
- Recommended next skill, mapped from verdict: `approved` or `approved_with_risks` → `auto-plan`; `needs_clarification` → `auto-frame` or `auto-office-hours`; `descoped` → `auto-office-hours` or stop. The user or host invokes the next skill; auto-ceo-review does not chain.

## Rules

- Be decisive, not theatrical. A sharp verdict is better than a long analysis.
- Do not turn the review into implementation design. Stay in product bet territory.
- Verdict vocabulary is strict. Use only the four approved values.
- If the spec is missing or unreadable, verdict is `needs_clarification`. Do not guess.

## Deep

### Review Template

Read `references/review-template.md` for the exact markdown format. (~21 lines: 5-field format covering verdict/strength/concern/action/de-scoped, with rules on sentence limits and no extra commentary.)

### Product Bet Framing

Read `references/bet-framing.md` for 10x check, platonic ideal, dream state mapping. (~70 lines: crisp vs. vague bet examples, reframing structure, 10x check, platonic ideal exercise, dream state mapping diagram, temporal interrogation by implementation hour, expansion framing FLAT vs. EXPANSIVE pattern.)

### Review Modes

Read `references/review-modes.md` for four scope postures and mode selection defaults. (~48 lines: SCOPE EXPANSION, SELECTIVE EXPANSION, HOLD SCOPE, SCOPE REDUCTION, each with ceremony/protocol; mode selection table by context.)

### Product Checklist

Read `references/product-checklist.md` for premise challenge, differentiation, scope calibration. (~44 lines: 7 check categories covering premise challenge, differentiation scan, scope calibration, leverage assessment, user sovereignty, anti-goal filter, temporal check.)

### Cognitive Patterns

Read `references/cognitive-patterns.md` for 18 thinking instincts. (~53 lines: 18 patterns from classification instinct to design-for-trust; application map linking patterns to review tasks.)
