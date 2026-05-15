---
name: auto-ceo-review
description: Evaluate whether a framed spec is worth building. Use after auto-frame when the product direction needs a go/no-go or scope correction before planning begins.
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: frame
  role: product-review
---

# auto-ceo-review

Evaluate whether a framed spec is worth building. Use after auto-frame when the product direction needs a go/no-go or scope correction before planning begins.

First action: run `scripts/get-context.mjs` from this skill's installed directory to load active change and stage.

## Preamble

This skill is a product bet review. It restates the objective as one crisp bet, identifies what is differentiated and valuable, and calls out where the direction is generic or mis-scoped. It does not design implementation. It does not write code.

Context budget: one read of SPEC.md, one review paragraph, one verdict.

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

Read `references/review-template.md` for the exact markdown format.

### Product Bet Framing

Read `references/bet-framing.md` for the 10x check, platonic ideal, dream state mapping, and expansion framing.

### Review Modes

Read `references/review-modes.md` for the four scope postures (EXPANSION, SELECTIVE EXPANSION, HOLD SCOPE, REDUCTION) and mode selection defaults.

### Product Checklist

Read `references/product-checklist.md` for the premise challenge, differentiation scan, scope calibration, leverage assessment, and anti-goal filter.

### Cognitive Patterns

Read `references/cognitive-patterns.md` for the 18 thinking instincts that shape product judgment.
