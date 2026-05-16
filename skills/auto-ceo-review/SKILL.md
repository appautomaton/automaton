---
name: auto-ceo-review
description: Product go/no-go on a framed spec. Use after auto-frame, before planning.
metadata:
  stage: frame
  role: product-review
---

# auto-ceo-review

Product-direction gate. Decides whether a spec is worth building before planning begins.

First action: run `scripts/get-context.mjs` to load active change and stage.

## Preamble

Product bet review. Restates the objective as one crisp bet, identifies differentiation, calls out generic or mis-scoped direction. Does not design implementation or write code.

Context budget: one SPEC.md read, one review paragraph, one verdict.

## Quality Gate

Before appending the product review:
- Replace strategic filler with user, action, value, and risk.
- Separate supported claims from assumptions.
- Name the strongest risk even when approving.
- Read `references/quality.md` when the review sounds like polite validation.

## Do

### Load State

Read `.agent/steering/STATUS.md`. Read the canonical `SPEC.md`.

### Restate the Bet

In one sentence: "We are betting that [specific user] will [specific action] because [specific reason], and the risk is [specific risk]."

### Evaluate

Assess differentiation, user value, generic or mis-scoped elements, and shippability. Ground each in evidence from the spec.

### Render Verdict

Use exactly one of the four approved values.

<VERDICT>

Use strict vocabulary. No synonyms.

| Verdict | Meaning | Next Action |
|---------|---------|-------------|
| `approved` | Direction is sound. Proceed to planning. | `auto-plan` |
| `approved_with_risks` | Direction is sound but carries known risks. Document them in the review. | `auto-plan` |
| `needs_clarification` | Direction cannot be evaluated. Return to framing. | `auto-frame` or `auto-office-hours` |
| `descoped` | Direction is out of scope or low-leverage. Do not pursue. | `auto-office-hours` or stop |
</VERDICT>

### Append Review

Add a `## Review: Product` section to `SPEC.md` using the exact template in `references/review-template.md`.

### Update State

Run `sync-status.mjs` from this skill's installed directory.
Update `.agent/.automaton/state/current.json`:
- `product_review` → `<verdict>`

### Recommend

State the next skill based on the verdict.

## Output

- `SPEC.md` with appended `## Review: Product` section
- `.agent/.automaton/state/current.json` updated with `product_review`
- Recommended next skill

## Rules

- Be decisive, not theatrical. A sharp verdict is better than a long analysis.
- Do not turn the review into implementation design. Stay in product bet territory.
- Verdict vocabulary is strict. Use only the four approved values.
- If the spec is missing or unreadable, verdict is `needs_clarification` — do not guess.

## Deep

### Review Template

Read `references/review-template.md` — exact markdown format.

### Product Bet Framing

Read `references/bet-framing.md` — 10x check, platonic ideal, dream state mapping.

### Review Modes

Read `references/review-modes.md` — four scope postures and mode selection defaults.

### Product Checklist

Read `references/product-checklist.md` — premise challenge, differentiation, scope calibration.

### Cognitive Patterns

Read `references/cognitive-patterns.md` — 18 thinking instincts.
