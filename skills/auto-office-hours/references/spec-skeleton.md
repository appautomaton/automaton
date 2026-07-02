# SPEC Skeleton

Write the approved objective as the top half of `.agent/work/<change-name>/SPEC.md`. Keep it a compact decision record, not a transcript. auto-frame completes the same file with selected lenses, required outcome, acceptance criteria, and anti-goals, then records `canonical_spec`. A SPEC.md without that pointer means framing is in progress.

The skeleton is a faithful record of what the user approved. Use the user's language where possible. When the agent reframed something and the user accepted it, capture the accepted version and note it was a reframe.

```markdown
# SPEC: {title}

**Bet:** {the one line wager this change makes}

Seeded by auto-office-hours on {date}
Active change: {change-name}
Work class: {Startup / Builder / Content} mode, {bug / feature / capability / roadmap} scale, {feature / refactor / parity / audit / migration / coverage / content / mixed} shape

## Goal
{the user's final refined objective, not the initial framing and not the agent's rewrite}

## Broader Intent
{larger goal this spec serves. Omit if identical to Goal}

## Mode Context
{include only the mode section that matters:}
{Startup: "Evidence". Cover demand, status quo/workaround, target user or wedge.}
{Builder: "What Makes This Cool". Cover core delight, novelty, or "whoa" factor.}
{Content: "Audience & Thesis". Cover reader, thesis, voice direction, content anti-goals.}

## Shape Context
{include only the section that changes framing or verification. Omit for plain feature shape when Mode Context is sufficient:}
{Parity: "Closure Target". Cover reference system, gap landscape, what "closed" means.}
{Audit: "Key Questions". Cover what the audit must answer, what decision depends on findings.}
{Refactor: "Structural Goal". Cover what invariant holds, what structural problem is solved.}
{Migration: "Target State". Cover source state, target state, compatibility constraints.}
{Coverage: "Risk Areas". Cover what is undertested, what types of tests are needed.}
{Mixed: combine the relevant sections above}

## Constraints
{hard limits that narrow the solution space. Omit if none}

## Scope Coverage
- Included: {material request items covered by this change}
- Deferred: {items outside this change and why. Omit if none}
- Anti-goals: {explicit exclusions for this change}
- Needs decision: {questions or options that would change scope. Omit if none}

## Scope Preservation
{whether this preserves the user's full stated intent or intentionally decomposes it}

## Approved Approach
{chosen approach, the evidence that supports it, and what it does not prove}

## Key Assumptions and Risks
{only assumptions or risks that change execution. Omit if none}

## Rejected or Deferred
{ruled-out framings and deferred scope with reasons. Omit if none}
```

## Rules

- Include `Supersedes:` in the header only if a prior skeleton exists for this change.
- The Goal must use the user's final refined language.
- Scope Coverage must classify material request context as included, deferred, anti-goal, or needs decision.
- Shape Context uses the section matching the work shape. Do not use delight language for parity, audit, refactor, migration, or coverage work.
- Content mode requires audience, thesis, voice direction, and content anti-goals.
- Omit empty sections and do not preserve the full alternatives analysis. Keep only the approved approach and material rejected/deferred items.
- Save to `.agent/work/<change-name>/SPEC.md`, never to host-specific paths.
- Do not write acceptance criteria, required outcome, or a final anti-goals field here. auto-frame owns them.
