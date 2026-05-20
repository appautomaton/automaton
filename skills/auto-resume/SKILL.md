---
name: auto-resume
description: Recover active change and next action from artifacts. Use on fresh session with existing work.
metadata:
  stage: resume
---

# auto-resume

Session recovery. Rebuilds context from durable artifacts, not memory or guessing.

First action: run `scripts/get-context.mjs` → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding.

## Preamble

auto-resume rebuilds context from durable artifacts, not from the user's description or the agent's training data. It loads canonical artifacts in dependency order (spec first, then design, then plan) and reports what it found, what was blocked, and what comes next.

Context budget: start with artifacts needed for the current stage. Read project files when understanding the codebase helps rebuild accurate context for the next action.

## Quality Gate

Before producing the recovery summary:
- Trust durable artifacts over memory.
- Report stale pointers plainly.
- Recommend a next skill only when recovered state has incomplete or blocked work. For verified completion, report no next lifecycle skill.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when the summary becomes narrative recap.

## Do

### Load State

Read `.agent/steering/STATUS.md`. Read `references/ARTIFACT-LIFECYCLE.md` for recovery order, stale-pointer handling, and stage handoffs. If the recovered state suggests the active change is complete or no active work exists, read `.agent/steering/ROADMAP.md` when it exists to surface pending phases as context, not to auto-start them.

If `.agent/` does not exist or `current.json` is missing, recommend `auto-onboard` and stop.

### Verify Artifact Integrity

<ARTIFACT-CHECK>

Check that canonical pointers in `current.json` resolve to actual files:
- `canonical_spec` → does `SPEC.md` exist?
- `canonical_design` → does `DESIGN.md` exist?
- `canonical_plan` → does `PLAN.md` exist?

If any pointer is stale (file missing or moved), report it plainly. Recommend `auto-onboard` if steering is missing, or `auto-frame` / `auto-plan` if the specific artifact is missing.
</ARTIFACT-CHECK>

### Load Artifacts in Dependency Order

<STATE-RECOVERY>

Load artifacts in this order. Stop at the current stage; do not load artifacts from future stages.

```
Stage: frame    → Load INTAKE.md (if exists), SPEC.md
Stage: plan     → Load SPEC.md, then DESIGN.md (if exists), then PLAN.md
Stage: execute  → Load SPEC.md, DESIGN.md (if exists), PLAN.md, current slice
Stage: verify   → Change complete; load PLAN.md only if reporting what was verified
Stage: resume   → Load SPEC.md, STATUS.md
```

If `current.json` and `STATUS.md` disagree on active change or stage, report the mismatch. Prefer `current.json` for recovery, but surface the discrepancy.
</STATE-RECOVERY>

### Surface Review State

If `current.json` contains `product_review` or `engineering_review`, read the corresponding `## Review:` sections from canonical artifacts and include them in the resume summary.

### Summarize

<CONTEXT-REPLAY>

Produce a concise summary:

```
**Active change:** [name]
**Stage:** [frame|plan|execute|verify|resume]
**Artifacts loaded:** [list]
**What was done:** [1-2 sentences]
**What was blocked:** [1-2 sentences, or "nothing"]
**What comes next:** [specific next action, or "none - change complete"]
**Review verdicts:** [product: X, engineering: Y, or "none"]
**Missing state:** [list or "none"]
**Roadmap:** [N pending / M total, or "not tracked"]
```

Keep it under 200 tokens. The goal is orientation, not transcription.
</CONTEXT-REPLAY>

### Recommend Next Skill

Based on the recovered state:
- Stage `frame` with intake but no spec → `auto-frame` (intake survives)
- Stage `frame` with no spec and no intake → `auto-frame`
- Stage `frame` with spec but no product review → `auto-ceo-review`
- Stage `plan` with no plan → `auto-plan`
- Stage `plan` with plan but no engineering review → `auto-eng-review`
- Stage `execute` → `auto-execute`
- Stage `verify` → change complete; report completion. If ROADMAP.md has pending items, surface them as optional future work, but do not recommend `auto-office-hours` unless the user explicitly asks to start the next phase.
- Stage `resume` with missing steering → `auto-onboard`
- Change complete and ROADMAP.md has pending items → report completion and name pending phases as optional future work; no next lifecycle skill by default
- Change complete and no pending roadmap items → report completion

## Output

- Resume summary (under 200 tokens)
- Artifacts loaded
- Review verdicts (if present)
- `.agent/.automaton/state/current.json` is read-only for auto-resume; stale pointers are reported, not silently repaired
- Diagnostic handling: missing or conflicting state surfaces as a `warning` in the summary; `error`-level diagnostics block the resume
- Recommended next skill when recovered state is incomplete or blocked; none when the active change is verified complete. The user or host invokes any next skill; auto-resume does not require nested invocation.

## Rules

- Prefer durable artifacts over memory.
- Do not restart discovery if the current artifacts are sufficient.
- Escalate contradictions instead of guessing.
- Load artifacts in dependency order: spec first, not plan first.
- If steering is scaffold-only, report it plainly and recommend `auto-onboard`.
- Do not turn a completed verified change into an automatic `auto-office-hours` handoff.

## Deep

### Recovery Scenarios

Read `references/recovery-scenarios.md` for common recovery situations. (~41 lines: 8 state→action pairs covering fresh session, no active change, stale pointers, current.json/STATUS.md mismatch, review verdict blocks, scaffold-level steering, multiple changes, stale status prose.)

### Artifact Dependency Order

Read `references/artifact-order.md` for the full artifact dependency graph. (~48 lines: ASCII dependency graph from REPO-MAP through PLAN, loading rules by stage in table form, 3 anti-patterns.)

### Context Budget

Read `references/CONTEXT-BUDGET.md` for progressive loading and degradation tiers. (~76 lines: 4 principles, 6-step loading order, 4 degradation tiers with behavioral rules, no-re-read rule with exceptions.)
