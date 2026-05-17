---
name: auto-verify
description: Verify completed plan against acceptance criteria. Use after all slices are executed.
metadata:
  stage: verify
  role: controller
---

# auto-verify

Verification gate. Independent audit of a completed plan — runs once, not per-slice.

First action: run `scripts/get-context.mjs` → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding.

## Preamble

The antifraud layer. Re-reads the plan, runs proof commands, compares fresh results to acceptance criteria. Does not trust execute's self-assessment. Does not fix what it finds.

Context budget: one PLAN.md read + verification commands per criterion. No broad scans beyond what commands require.

## Quality Gate

Before writing the verification report:
- Tie every result to fresh command output or direct observation.
- Name skipped checks explicitly — omission is not a pass.
- Treat partial evidence as FAIL for the plan.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when the report sounds confident without proof.

## Do

### Load State

Read `.agent/steering/STATUS.md`. Read the canonical `PLAN.md`.

If slices link `slices/slice-NNN.md` detail files or reference requirement IDs in `spec/*.md`, load only those files. Linked detail file and traceability IDs are normative; do not verify from an unlinked supplemental file.

If any slice involves prose, read `references/content-verification.md` (~54 lines: 8-check verification contract, anti-slop pattern scan, source/fact checks, report shape) and include its content checks.

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

Read `references/verification-template.md` — extended format guidance. (~33 lines: grouped-by-slice report format with Criterion/Result/Evidence/Gap per entry; rules on evidence requirements and PARTIAL counting as FAIL.)

### Common Verification Gaps

Read `references/common-gaps.md` — frequently missed scenarios. (~51 lines: 6-category checklist — input validation, error handling, state/side-effects, security, observability, edge cases — with specific items per category.)

### Artifact Lifecycle

Read `references/ARTIFACT-LIFECYCLE.md` when state pointer or handoff rules need clarification. (~70 lines: stage handoffs table, progressive disclosure layout with allowed paths, review verdict routing, STOP conditions.)
