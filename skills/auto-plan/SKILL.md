---
name: auto-plan
description: Turn an approved spec into ordered slices. Use when framing is accepted and planning begins.
metadata:
  stage: plan
  role: controller
---

# auto-plan

Planning controller. Turns approved framing into ordered slices with verification commands.

First action: run `scripts/get-context.mjs` to load active change, stage, and review status.

## Preamble

auto-plan builds the smallest plan that makes execution safe while preserving the approved scope. It does not write code. It breaks work into ordered slices, each producing a testable outcome. Small slices use defaults; material risk, dependency, or checkpoint differences are explicit.

Context budget: `PLAN.md` is the reloadable execution index, not the whole implementation dossier. Keep PLAN.md compact enough to re-read. For large coherent work, summarize slices in PLAN.md and link optional detail files under `.agent/work/<change>/slices/`. Split only for independent outcomes, not because one coherent plan has many requirements.

## Quality Gate

Before finalizing `PLAN.md`:
- Give every material slice a concrete output.
- Attach a verification command to every material slice.
- Name the execution topology: default continuation path, explicit checkpoints, subagent routes, and any parallel-safe groups.
- Remove vague tasks that do not define done.
- Read `references/quality.md` when the plan leaves execution decisions to the implementer.

## Do

### Context Loading

Load files in this order. Stop as soon as you have enough to proceed.

<CONTEXT-LOADING>

```
1. .agent/.automaton/state/current.json (always — < 50 tokens)
2. STATUS.md             (always — < 200 tokens)
3. SPEC.md               (always — < 1000 tokens)
4. Linked spec detail    (only files named by SPEC.md and needed for planning)
5. DESIGN.md             (if exists and relevant — < 1000 tokens)
6. Wiki pages            (only if referenced by spec or plan)
7. Source files          (only the files the current slice touches)
```

Do not load source files unless the plan requires understanding existing code patterns. Do not ignore linked `spec/*.md` files when they contain normative requirements, gap IDs, invariants, or acceptance detail.
</CONTEXT-LOADING>

### Assess Review State (if reviews exist)

If `product_review` exists in `current.json`, read the `## Review: Product` section from `SPEC.md` and factor its conclusions into the plan. If `product_review: approved_with_risks`, ensure the plan explicitly addresses each risk. If `product_review: descoped` or `needs_clarification`, stop and recommend `auto-frame`.

If the engineering approach is complex or risky, recommend `auto-eng-review` before execution.

If SPEC.md contains content fields (Audience, Thesis, Voice, Content Anti-Goals) or the change produces writing, articles, briefs, decks, newsletters, documentation, or proposals, read `references/content-planning.md`. Carry content fields into the plan; add channel, source policy, factual risk, and format where they affect execution or verification.

If `SPEC.md` names requirement IDs, gap IDs, invariants, audit questions, migration checkpoints, or coverage targets, preserve those IDs in PLAN.md and attach them to the slices that satisfy them. Do not collapse traceable requirements into untraceable prose.

### Design Slices

Break work into ordered execution units, not topic buckets. Each slice must be:
- Testable: it produces an outcome that can be verified.
- Bounded: it consumes a known fraction of the context window.
- Independent: it can be executed without loading slices that come after it.
- Checkpointed only for human input: it marks a pause only when a human must act or choose before the next approved slice can start.

For content slices, also name the artifact target, allowed sources, factual-risk gate, and format constraint so `auto-execute` does not invent missing context.

Before writing slices, think ahead to execution topology: which slices must run serially, which checkpoints require human judgment, which use subagents, and whether any parallel-safe groups exist. Continuation is the default after a verified slice; mark a checkpoint only when the agent must pause for human verification, a human decision, or a human action. Parallel-safe means dependencies are independent and write sets are disjoint; default to none.

<SLICE-DESIGN>

Frame each slice with required fields first, then only the overrides the slice needs:

```
### Slice N: [Name]

Required:
**Objective:** [one sentence]
**Acceptance criteria:**
- [observable criterion]
**Verification:** [command or check that proves the slice is done]

Defaults, state only when overriding:
**Execution:** direct | subagent recommended | subagent required — default: direct
**Depends on:** none
**Checkpoint after:** none | human-verify | decision | human-action — default: none
**Checkpoint reason:** none

Include when useful:
**Touches:** [files, directories, or subsystems]
**Context budget:** [~X% of context window]
**Produces:** [specific artifact or state change]
**Detail:** [linked `slices/slice-NNN.md` file]
```

Rules:
- Every material slice must have a verification command.
- Every material slice must have acceptance criteria; execution cannot verify vibes.
- Omitted `Execution` means `direct`. State `subagent recommended` when the slice touches > 3 files, crosses subsystem boundaries, modifies shared interfaces or data schemas, or carries review risk. State `subagent required` only when the user asked for multi-agent execution or the slice modifies security-critical paths, production data, or irreversible state.
- Omitted `Depends on` means `none`.
- Continuation is the default. Omitted `Checkpoint after` means `none`, so the next slice may start after verification passes.
- Verification findings, implementation caveats, downstream consequences, and next-slice recommendations are not checkpoints when the approved plan already names the next slice. Record them as slice evidence or risks and continue.
- Use `human-verify` only when the result cannot be verified by available commands, tests, host tools, or local inspection.
- Use `decision` only when the user must choose among named product, architecture, design, or scope options before the next slice can start. The checkpoint reason must include the concrete question and options. Do not use `decision` for reversible engineering judgment, known limitations, validation results, or "next slice should be..." notes.
- Use `human-action` when progress requires an external action the agent cannot perform, such as 2FA, account approval, or off-machine access.
- Slices should be small enough to complete in one session.
- If a coherent slice exceeds ~15% of context window, move extended instructions to `slices/slice-NNN.md` and keep PLAN.md as the index. Split the slice only when it contains independent outcomes.
</SLICE-DESIGN>

### Write PLAN.md

Write the plan to `.agent/work/<change>/PLAN.md`.

Required sections:
- **Goal** — restate the bounded goal from SPEC.md
- **Architecture approach** — the smallest correct design
- **Requirement traceability** — gap IDs, invariant IDs, audit questions, migration checkpoints, or coverage targets mapped to slices when present
- **Ordered slice sequence** — slices in dependency order, with linked detail files when needed
- **Execution routing and topology** — default route/checkpoint policy plus explicit overrides, checkpoints, and parallel-safe groups (or "none")
- **Verification commands** — attached to every material slice
- **Context budget for this change** — total estimated context consumption

### Write DESIGN.md (if non-trivial)

If the architecture is non-trivial or new patterns are introduced, write `DESIGN.md` to `.agent/work/<change>/DESIGN.md`. Keep it under 200 lines. If the architecture is obvious from the spec, skip this file.

<HARD-GATE>

Do NOT write PLAN.md if:
- SPEC.md is missing or unreadable.
- `product_review` is `descoped` or `needs_clarification`.
- The scope is still ambiguous after reading SPEC.md.

If any of these are true, recommend `auto-frame` and stop.
</HARD-GATE>

### Update State

Run `sync-status.mjs` from this skill's installed directory.
Update `.agent/.automaton/state/current.json`:
- `canonical_design` → path to DESIGN.md (if written)
- `canonical_plan` → path to PLAN.md
- `stage` → `plan`

## Output

- `PLAN.md` — written to `.agent/work/<change>/PLAN.md`
- `DESIGN.md` — written to `.agent/work/<change>/DESIGN.md` (if needed)
- `.agent/.automaton/state/current.json` updated with `canonical_design` and `canonical_plan`
- Recommended next skill: `auto-eng-review` or `auto-execute`

## Rules

- Prefer the smallest correct design.
- Remove placeholders instead of preserving them.
- Do not broaden scope to cover hypothetical future work.
- Preserve review sections on refresh unless the user explicitly requests consolidation.
- Every material slice must have acceptance criteria and an explicit verification command.

## Deep

### Slice Design Examples

Read `references/slice-examples.md` — well-designed vs. poorly-designed slices.

### Verification Patterns

Read `references/verification-patterns.md` — common verification commands by stack.

### Context Budget

Read `references/CONTEXT-BUDGET.md` — progressive loading and degradation tiers.

### Artifact Lifecycle

Read `references/ARTIFACT-LIFECYCLE.md` when handoff rules or state pointer boundaries need clarification.
