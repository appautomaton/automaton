---
name: auto-resume
description: Recover the active change, stage, and next action from Automaton artifacts. Use when a fresh session must continue existing work without guessing.
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: resume
  role: controller
---

# auto-resume

Recover the active change, stage, and next action from Automaton artifacts. Use when a fresh session must continue existing work without guessing.

First action: run `scripts/get-context.mjs` from this skill's installed directory to read the current state. This is the single source of truth for recovery.

## Preamble

auto-resume rebuilds context from durable artifacts, not from the user's description or the agent's training data. It loads canonical artifacts in dependency order (spec first, then design, then plan) and reports what it found, what was blocked, and what comes next.

Context budget: load only the artifacts needed for the current stage. Do not load the full wiki.

## Quality Gate

Before producing the recovery summary:
- Trust durable artifacts over memory.
- Report stale pointers plainly.
- Recommend one next skill with the reason.
- Read `references/quality.md` if the summary becomes narrative recap.

## Do

### 1. Load State

Read `.agent/steering/STATUS.md`. Read `references/ARTIFACT-LIFECYCLE.md` for recovery order, stale-pointer handling, and stage handoffs.

If `.agent/` does not exist or `current.json` is missing, recommend `auto-onboard` and stop.

### 2. Verify Artifact Integrity

<ARTIFACT-CHECK>

Check that canonical pointers in `current.json` resolve to actual files:
- `canonical_spec` → does `SPEC.md` exist?
- `canonical_design` → does `DESIGN.md` exist?
- `canonical_plan` → does `PLAN.md` exist?

If any pointer is stale (file missing or moved), report it plainly. Recommend `auto-onboard` if steering is missing, or `auto-frame` / `auto-plan` if the specific artifact is missing.
</ARTIFACT-CHECK>

### 3. Load Artifacts in Dependency Order

<STATE-RECOVERY>

Load artifacts in this order. Stop at the current stage — do not load artifacts from future stages.

```
Stage: frame    → Load SPEC.md
Stage: plan     → Load SPEC.md, then DESIGN.md (if exists), then PLAN.md
Stage: execute  → Load SPEC.md, DESIGN.md (if exists), PLAN.md, current slice
Stage: verify   → Load SPEC.md, DESIGN.md (if exists), PLAN.md, VERIFY.md (if exists)
Stage: resume   → Load SPEC.md, STATUS.md
```

If `current.json` and `STATUS.md` disagree on active change or stage, report the mismatch. Prefer `current.json` for recovery, but surface the discrepancy.
</STATE-RECOVERY>

### 4. Surface Review State

If `current.json` contains `product_review` or `engineering_review`, read the corresponding `## Review:` sections from canonical artifacts and include them in the resume summary.

### 5. Summarize

<CONTEXT-REPLAY>

Produce a concise summary:

```
**Active change:** [name]
**Stage:** [frame|plan|execute|verify|resume]
**Artifacts loaded:** [list]
**What was done:** [1-2 sentences]
**What was blocked:** [1-2 sentences, or "nothing"]
**What comes next:** [specific next action]
**Review verdicts:** [product: X, engineering: Y, or "none"]
**Missing state:** [list or "none"]
```

Keep it under 200 tokens. The goal is orientation, not transcription.
</CONTEXT-REPLAY>

### 6. Recommend Next Skill

Based on the recovered state:
- Stage `frame` with no spec → `auto-frame`
- Stage `frame` with spec but no product review → `auto-ceo-review`
- Stage `plan` with no plan → `auto-plan`
- Stage `plan` with plan but no engineering review → `auto-eng-review`
- Stage `execute` → `auto-execute`
- Stage `verify` → `auto-verify`
- Stage `resume` with missing steering → `auto-onboard`

## Output

- Resume summary (under 200 tokens)
- Artifacts loaded
- Review verdicts (if present)
- Missing or conflicting state
- Recommended next skill

## Rules

- Prefer durable artifacts over memory.
- Do not restart discovery if the current artifacts are sufficient.
- Escalate contradictions instead of guessing.
- Load artifacts in dependency order: spec first, not plan first.
- If steering is scaffold-only, report it plainly and recommend `auto-onboard`.

## Deep

### Recovery Scenarios

Read `references/recovery-scenarios.md` for examples of common recovery situations and how to handle them.

### Artifact Dependency Order

Read `references/artifact-order.md` for the full dependency graph of artifacts across stages.

### Context Budget

Read `references/CONTEXT-BUDGET.md` for progressive loading rules and degradation tiers.
