---
name: auto-ceo-review
description: Optional product go/no-go on a framed spec. Use when product direction needs review before planning.
metadata:
  stage: frame
---

# auto-ceo-review

Optional product-direction review. Decides whether a spec is worth building before planning begins.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root.

## Preamble

Product bet review. Restates the objective as one crisp bet, identifies differentiation, calls out generic or mis-scoped direction. Does not design implementation or write code.

Loading discipline: one SPEC.md read, one review paragraph, one verdict. Read project files when understanding the codebase helps ground the review — verify that spec claims reflect what actually exists before approving or rejecting.

## Quality Gate

Before appending the product review:
- Replace strategic filler with user, action, value, and risk.
- Separate supported claims from assumptions.
- Name the strongest risk even when approving.
- Read `references/quality.md` (~36 lines) when the review sounds like polite validation.

## Do

<GATE>

Do NOT proceed unless:
- `canonical_spec` is set and `SPEC.md` is readable.

If the spec is missing or unreadable, set verdict to `needs_clarification` and stop.
</GATE>

### Load State

Read the canonical `SPEC.md`.

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

Run `node .agent/.automaton/scripts/sync-status.mjs --product-review "<verdict>"` from the project root.

### Recommend

On a non-blocking verdict (`approved` or `approved_with_risks`), continue inline into `auto-plan`. On `needs_clarification` or `descoped`, stop and recommend the mapped skill.

## Output

- `SPEC.md` with appended `## Review: Product` section
- `.agent/.automaton/state/current.json` updated through `sync-status.mjs` with `product_review`; `stage` is unchanged by this skill
- Diagnostic handling: `error`-level diagnostics block the review; `warning`-level diagnostics surface to the next stage
- Next handoff, mapped from verdict: `approved` or `approved_with_risks` → continue inline into `auto-plan`; `needs_clarification` → stop, recommend `auto-frame` or `auto-office-hours`; `descoped` → stop, recommend `auto-office-hours` or halt.

## Rules

- Be decisive, not theatrical. A sharp verdict is better than a long analysis.
- Do not turn the review into implementation design. Stay in product bet territory.
- Verdict vocabulary is strict. Use only the four approved values.

## Deep

- Read `references/review-template.md` for the exact markdown format.
- Read `references/bet-framing.md` for 10x check, platonic ideal, dream state mapping.
- Read `references/review-modes.md` for four scope postures and mode selection defaults.
- Read `references/product-checklist.md` for premise challenge, differentiation, scope calibration.
- Read `references/cognitive-patterns.md` for 18 thinking instincts.
