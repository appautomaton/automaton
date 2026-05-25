---
name: auto-resume
description: Recover active change and next action from artifacts. Use on fresh session with existing work.
metadata:
  stage: resume
---

# auto-resume

Session recovery. Rebuilds context from durable artifacts, not memory or guessing.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root. If the command fails, briefly troubleshoot the invocation or runtime path. If it runs and returns error diagnostics, report them and stop before writing artifacts.

## Preamble

auto-resume rebuilds context from durable artifacts, not from the user's description or the agent's training data. It does not modify artifacts, advance the stage, or start new work. It loads canonical artifacts in dependency order (spec first, then design, then plan) and reports what it found, what was blocked, and what comes next.

Loading discipline: start with artifacts needed for the current stage. Read project files when understanding the codebase helps rebuild accurate context for the next action.

## Quality Gate

Before producing the recovery summary:
- Trust durable artifacts over memory.
- Report stale pointers plainly.
- Recommend a next skill only when recovered state has incomplete or blocked work. For verified completion, report no next lifecycle skill.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when the summary becomes narrative recap.

## Do

### Load State

Read `.agent/.automaton/references/ARTIFACT-LIFECYCLE.md` for recovery order, stale-pointer handling, and stage handoffs. If `.agent/` or `current.json` is missing, recommend `auto-onboard` and stop. If work is complete or absent, read `.agent/steering/ROADMAP.md` only to surface pending phases as context.

### Verify Artifact Integrity

Check that `canonical_spec`, `canonical_design`, and `canonical_plan` resolve when present. If any pointer is stale, report it plainly; recommend `auto-onboard` for missing steering, `auto-frame` for missing SPEC.md, or `auto-plan` for missing PLAN.md.

### Load Artifacts

Treat `current.json` as the only source for active change, stage, and canonical artifact pointers. Load artifacts in dependency order and stop at the current stage; read `references/artifact-order.md` for the full stage table.

### Surface Review State

If `current.json` contains `product_review` or `engineering_review`, read the corresponding `## Review:` sections from canonical artifacts and include them in the resume summary.

### Recovery Summary

Produce a concise summary under 200 tokens:

```
**Active change:** [name]
**Stage:** [frame|plan|execute|verify|verified|resume]
**Artifacts loaded:** [list]
**What was done:** [1-2 sentences]
**What was blocked:** [1-2 sentences, or "nothing"]
**What comes next:** [specific next action, or "none - change complete"]
**Review verdicts:** [product: X, engineering: Y, or "none"]
**Missing state:** [list or "none"]
**Roadmap:** [N pending / M total, or "not tracked"]
```

The goal is orientation, not transcription.

### Recommend Next Skill

Use `references/recovery-scenarios.md` for the full routing table. The invariant: recommend the next lifecycle skill only when recovered state is incomplete or blocked. For verified completion, report no next lifecycle skill; if ROADMAP.md has pending items, surface them as optional future work, not an automatic `auto-office-hours` handoff.

## Output

- Resume summary (under 200 tokens)
- Artifacts loaded
- Review verdicts (if present)
- `.agent/.automaton/state/current.json` is read-only for auto-resume; stale pointers are reported, not silently repaired
- Diagnostic handling: missing or conflicting state surfaces as a `warning` in the summary; `error`-level diagnostics block the resume
- Recommended next skill when recovered state is incomplete or blocked; none when the active change is verified complete. The user or host invokes the next skill; auto-resume does not chain.

## Rules

- Prefer durable artifacts over memory.
- Do not restart discovery if the current artifacts are sufficient.
- Escalate contradictions instead of guessing.
- Load artifacts in dependency order: spec first, not plan first.
- If steering is scaffold-only, report it plainly and recommend `auto-onboard`.
- Do not turn a completed verified change into an automatic `auto-office-hours` handoff.

## Deep

### Recovery Scenarios

Read `references/recovery-scenarios.md` for common recovery situations. (~31 lines: state→action pairs covering fresh session, no active change, stale pointers, review verdict blocks, scaffold-level steering, and multiple changes.)

### Artifact Dependency Order

Read `references/artifact-order.md` for the full artifact dependency graph. (~48 lines: ASCII dependency graph from REPO-MAP through PLAN, loading rules by stage in table form, 3 anti-patterns.)

### Context Loading Discipline

Read `.agent/.automaton/references/CONTEXT-BUDGET.md` for progressive loading and degradation tiers. (~76 lines: 4 principles, 6-step loading order, 4 degradation tiers with behavioral rules, no-re-read rule with exceptions.)
