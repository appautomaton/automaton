---
name: auto-plan
description: Turn approved framing into executable work artifacts and ordered tasks. Use when scope is accepted and the next step is to write or refresh PLAN.md, DESIGN.md, or verification steps.
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: plan
  role: controller
---

# auto-plan

Turn approved framing into executable work artifacts and ordered tasks. Use when scope is accepted and the next step is to write or refresh PLAN.md, DESIGN.md, or verification steps.

First action: run `scripts/get-context.mjs` from this skill's installed directory to load active change, stage, and review status.

## Preamble

auto-plan builds the smallest plan that makes execution safe. It does not write code. It breaks work into ordered slices, each producing a testable outcome, and attaches explicit execution routing, execution topology, and verification commands to every material slice.

Context budget: PLAN.md itself must fit in ~10% of the context window. If it exceeds 300 lines, the change needs more framing or should be split into multiple changes.

## Quality Gate

Before finalizing `PLAN.md`:
- Give every material slice a concrete output.
- Attach a verification command to every material slice.
- Name the execution topology: auto-continue chain, checkpoints, subagent routes, and any parallel-safe groups.
- Remove vague tasks that do not define done.
- Read `references/quality.md` if the plan leaves execution decisions to the implementer.

## Do

### 1. Context Loading

Load files in this order. Stop as soon as you have enough to proceed.

<CONTEXT-LOADING>

```
1. .agent/.automaton/state/current.json (always — < 50 tokens)
2. STATUS.md             (always — < 200 tokens)
3. SPEC.md               (always — < 1000 tokens)
4. DESIGN.md             (if exists and relevant — < 1000 tokens)
5. Wiki pages            (only if referenced by spec or plan)
6. Source files          (only the files the current slice touches)
```

Do not load source files unless the plan requires understanding existing code patterns.
</CONTEXT-LOADING>

### 2. Assess Review State

If `product_review` exists in `current.json`, read the `## Review: Product` section from `SPEC.md` and factor its conclusions into the plan. If `product_review: approved_with_risks`, ensure the plan explicitly addresses each risk. If `product_review: descoped` or `needs_clarification`, stop and recommend `auto-frame`.

If the engineering approach is complex or risky, recommend `auto-eng-review` before execution.

If `SPEC.md` contains content fields (Audience, Thesis, Voice, Content Anti-Goals) or the change is about writing, articles, briefs, decks, newsletters, documentation, proposals, or rewrite passes, read `references/content-planning.md`. Carry audience, thesis, voice, and content anti-goals from SPEC.md into the plan, and add channel, source policy, factual risk, and format where they affect slice execution or verification.

### 3. Design Slices

Break work into ordered execution units, not topic buckets. Each slice must be:
- Testable: it produces an outcome that can be verified.
- Bounded: it consumes a known fraction of the context window.
- Independent: it can be executed without loading slices that come after it.
- Checkpoint-aware: it ends where verification or a decision may change later work.

For content slices, also name the artifact target, allowed sources, factual-risk gate, and format constraint so `auto-execute` does not invent missing context.

Before writing slices, think ahead to execution topology: which slices must run serially, which may auto-continue after verification, which are checkpoint boundaries, which use subagents, and whether any parallel-safe groups exist. Parallel-safe means dependencies are independent and write sets are disjoint; default to none.

<SLICE-DESIGN>

Frame each slice as:

```
### Slice N: [Name]

**Objective:** [one sentence]
**Execution:** direct | subagent recommended | subagent required
**Depends on:** [slice IDs or "none"]
**Touches:** [files, directories, or subsystems]
**Context budget:** [~X% of context window]
**Produces:** [specific artifact or state change]
**Acceptance criteria:**
- [observable criterion]
**Verification:** [command or check that proves the slice is done]
**Auto-continue:** yes | no
```

Rules:
- Every material slice must have a verification command.
- Every material slice must state an execution route: `direct`, `subagent recommended`, or `subagent required`.
- Use `direct` when the slice touches ≤ 3 files in one subsystem. Use `subagent recommended` when the slice touches > 3 files, crosses subsystem boundaries, modifies shared interfaces or data schemas, or carries review risk. Use `subagent required` only when the user asked for multi-agent execution or the slice modifies security-critical paths, production data, or irreversible state.
- `Auto-continue` defaults to `no`; use `yes` only when the next slice may start after this slice passes verification without user input.
- Use `Auto-continue: no` for checkpoints, compatibility reports, architecture decisions, external dependencies, broad cross-surface changes, or ambiguous blocker outcomes.
- Slices should be small enough to complete in one session.
- If a slice exceeds ~15% of context window, split it.
</SLICE-DESIGN>

### 4. Write PLAN.md

Read `references/ARTIFACT-LIFECYCLE.md` for plan-stage handoff and state pointer boundaries. Write the plan to `.agent/work/<change>/PLAN.md`.

Required sections:
- **Goal** — restate the bounded goal from SPEC.md
- **Architecture approach** — the smallest correct design
- **Ordered task sequence** — slices in dependency order
- **Execution routing and topology** — direct or subagent route for each material slice; auto-continue chain, checkpoints, and parallel-safe groups (or "none")
- **Verification commands** — attached to every material slice
- **Context budget for this change** — total estimated context consumption

### 5. Write DESIGN.md (if needed)

If the architecture is non-trivial or new patterns are introduced, write `DESIGN.md` to `.agent/work/<change>/DESIGN.md`. Keep it under 200 lines. If the architecture is obvious from the spec, skip this file.

<HARD-GATE>

Do NOT write PLAN.md if:
- SPEC.md is missing or unreadable.
- `product_review` is `descoped` or `needs_clarification`.
- The scope is still ambiguous after reading SPEC.md.

If any of these are true, recommend `auto-frame` and stop.
</HARD-GATE>

### 6. Update State

Run this skill's installed `sync-status.mjs` from the same host skill root to align `STATUS.md` with the current state.

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
- Every material slice must have an explicit verification command.
- Do not write code. Do not create implementation files.

## Deep

### Slice Design Examples

Read `references/slice-examples.md` for examples of well-designed and poorly-designed slices.

### Verification Patterns

Read `references/verification-patterns.md` for common verification commands by technology stack.

### Context Budget

Read `references/CONTEXT-BUDGET.md` for progressive loading rules and degradation tiers.
