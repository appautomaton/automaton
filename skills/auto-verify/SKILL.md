---
name: auto-verify
description: Verify the completed plan against acceptance criteria with fresh evidence. Use after all slices are executed — not per-slice.
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: verify
  role: controller
---

# auto-verify

Independent audit of a completed plan. Runs once after all slices execute — not per-slice, not mid-execution.

First action: run `scripts/get-context.mjs` from this skill's installed directory to load active change and stage.

## Preamble

auto-verify is the antifraud layer. It re-reads the plan, runs proof commands, and compares fresh results to acceptance criteria. It does not trust execute's self-assessment. It does not fix what it finds. Partial evidence is not completion.

Context budget: one read of PLAN.md + verification commands for each criterion. No broad scans, no source-file reads beyond what commands require.

## Quality Gate

Before writing the verification report:
- Tie every result to fresh command output or direct observation.
- Name skipped checks explicitly — omission is not a pass.
- Treat partial evidence as FAIL for the plan.
- Read `references/quality.md` when the report sounds confident without proof.

## Do

### Load State

Read `.agent/steering/STATUS.md`. Read the canonical `PLAN.md`. Read `references/ARTIFACT-LIFECYCLE.md` for verify-stage handoff and state pointer boundaries.

If slices link `slices/slice-NNN.md` detail files or reference requirement IDs in `spec/*.md`, load only those files. Linked detail file and traceability IDs are normative; do not verify from an unlinked supplemental file.

If any slice creates, rewrites, edits, outlines, or audits prose, read `references/content-verification.md` and include its content checks in the verification pass.

### Collect Acceptance Criteria

Gather every acceptance criterion and verification command from every slice in PLAN.md. Build a checklist: slice name → criterion → command. This is a plan-level audit.

### Run Verification

Execute verification commands for each criterion. Mark each: PASS, FAIL, or PARTIAL. If a criterion lacks a verification command in the plan, derive one from the acceptance criterion and document what you ran.

For content slices, verify audience, thesis, voice, content anti-goals, channel, source policy, factual risk, format, and anti-slop scan with evidence.

### Evaluate

Binary: the plan passes only when every criterion across all slices passes. One FAIL means the plan fails.

### Report

```
## Verification: [Change Name]

### Slice N: [Name]
- Criterion: [acceptance criterion]
  Result: PASS / FAIL / PARTIAL
  Evidence: [command output or observation]
  Gap: [what is missing, or "none"]

[Repeat for each criterion in each slice]

**Overall:** PASS / FAIL
**Passed:** [N] of [M] criteria
**Gaps:** [structured list or "none"]
**Recommended next skill:** [auto-resume | auto-execute]
```

### On Pass

- Update `.agent/.automaton/state/current.json`: `stage` → `verify`
- Run `sync-status.mjs` from this skill's installed directory.
- If `.agent/steering/ROADMAP.md` exists, update the matching phase to `status: done` per `references/ROADMAP-CONTRACT.md`. Match by the phase's `change:` field against `active_change`; skip if empty or no match.
- Recommend `auto-resume`.

### On Fail

Do NOT update state. Annotate failed slices in `PLAN.md` with structured gap blocks:

```
> **VERIFY-GAP:** [criterion that failed]
> **Evidence:** [what the command returned]
> **Fix objective:** [what execute must address]
```

Recommend `auto-execute` — it reads these annotations on re-entry.

## Output

- Verification report (inline)
- `PLAN.md` annotated with `VERIFY-GAP` blocks (on failure)
- `.agent/.automaton/state/current.json` updated (on pass only)
- `.agent/steering/ROADMAP.md` phase marked done (on pass, if applicable)
- Recommended next skill

## Rules

- Fresh evidence only. Do not rely on execution-session memory or prior verification results.
- Binary evaluation. Partial evidence is FAIL for the plan.
- Do not fix during verification. Report gaps and return to execute.
- Verify the plan holistically — all slices, all criteria.
- If verification commands are missing from the plan, derive and run them. Document what you ran.

## Deep

### Verification Report Template

Read `references/verification-template.md` for extended format guidance.

### Common Verification Gaps

Read `references/common-gaps.md` for a checklist of frequently missed scenarios.
