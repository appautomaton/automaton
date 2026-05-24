---
name: auto-verify
description: Verify completed plan against acceptance criteria. Use after all slices are executed.
metadata:
  stage: verify
---

# auto-verify

Verification gate. Independent audit of a completed plan; runs once, not per-slice.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding.

## Preamble

The antifraud layer. Re-reads the plan, runs proof commands, compares fresh results to acceptance criteria. Does not trust execute's self-assessment. Does not fix what it finds.

Loading discipline: one PLAN.md read + verification commands per criterion. Read source files when verifying correctness requires inspecting the actual changes, not just command output.

## Quality Gate

Before writing the verification report:
- Tie every result to fresh command output or direct observation.
- Name skipped checks explicitly. Omission is not a pass.
- Treat partial evidence as FAIL for the plan.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when the report sounds confident without proof.

## Do

### Load State

Read `.agent/steering/STATUS.md`. Read the canonical `PLAN.md`.

If slices link `slices/slice-NNN.md` detail files or reference requirement IDs in `spec/*.md`, load only those files. Linked detail file and traceability IDs are normative; do not verify from an unlinked supplemental file.

If any slice involves prose, read `references/content-verification.md` (~54 lines: 8-check verification contract, anti-slop pattern scan, source/fact checks, report shape) and include its content checks.

### Collect Acceptance Criteria

Gather every acceptance criterion and verification command from every slice in PLAN.md. Build a checklist: slice name → criterion → command. This is a plan-level audit.

<GATE>

Do NOT modify source code, tests, or project artifacts during verification. Verify reads and runs commands; it does not fix.
</GATE>

### Run Verification

Execute verification commands for each criterion. Mark each: PASS, FAIL, or PARTIAL. If a criterion lacks a verification command in the plan, derive one from the acceptance criterion and document what you ran.

For content slices, verify audience, thesis, voice, content anti-goals, channel, source policy, factual risk, format, and anti-slop scan with evidence.

### Evaluate

Binary: the plan passes only when every criterion across all slices passes. One FAIL means the plan fails.

### Report

Build the full criterion checklist internally. Report compactly by default: summarize passing criteria by slice and expand failures, skipped checks, derived commands, or PARTIAL results. If the plan has only 1-2 criteria, listing each criterion is fine.

```
## Verification: [Change Name]

### Slice N: [Name]
- PASS: [count] criteria, evidence: [commands or observations]
- FAIL/PARTIAL/SKIPPED: [criterion, result, evidence, gap]

[Repeat only for slices with material results]

PASS summary:
**Overall:** PASS
**Passed:** [M] of [M] criteria
**Gaps:** none
**Change status:** complete
**New objective:** use `auto-office-hours` to shape the next objective when you are ready.

FAIL summary:
**Overall:** FAIL
**Passed:** [N] of [M] criteria
**Gaps:** [structured list]
**Change status:** incomplete
**Recommended next skill:** auto-execute
```

### On Pass

- Update `.agent/.automaton/state/current.json`: `stage` → `verify`
- Run `node .agent/.automaton/scripts/sync-status.mjs` from the project root.
- If `.agent/steering/ROADMAP.md` exists, update the matching phase to `status: done` per `.agent/.automaton/references/ROADMAP-CONTRACT.md`. Match by the phase's `change:` field against `active_change`; skip if empty or no match.
- End the report with `Change status: complete` and a separate `New objective` line pointing to `auto-office-hours` for future work. Do not print a `Recommended next skill` line on PASS. Use `auto-resume` only for later re-entry or recovery.

### On Fail

Do NOT update state. Annotate failed slices in `PLAN.md` with structured gap blocks:

```
> **VERIFY-GAP:** [criterion that failed]
> **Evidence:** [what the command returned]
> **Fix objective:** [what execute must address]
```

Recommend `auto-execute`; it reads these annotations on re-entry.

## Output

- Verification report (inline)
- `PLAN.md` annotated with `VERIFY-GAP` blocks (on failure)
- `.agent/.automaton/state/current.json` updated to `stage: verify` (on pass only); state unchanged on fail
- `.agent/steering/ROADMAP.md` phase marked done (on pass, if applicable)
- Diagnostic handling: `error`-level diagnostics block the verification run; `warning`-level findings surface to the report
- PASS closeout: report `Change status: complete` and `New objective: use auto-office-hours`; do not emit `Recommended next skill`
- FAIL closeout: recommend `auto-execute`. The user or host invokes the next skill; auto-verify does not chain.

## Rules

- Fresh evidence only. Do not rely on execution-session memory or prior verification results.
- Binary evaluation. Partial evidence is FAIL for the plan.
- Do not fix during verification. Report gaps and return to execute.
- Verify the plan in full: all slices, all criteria.
- If verification commands are missing from the plan, derive and run them. Document what you ran.
- Do not print a long pass transcript. Expand only failures, skipped checks, derived commands, or user-requested detail.

## Deep

### Verification Report Template

Read `references/verification-template.md` for extended format guidance. (~43 lines: grouped-by-slice report format with Criterion/Result/Evidence/Gap per entry; PASS/FAIL summary shapes; rules on evidence requirements and PARTIAL counting as FAIL.)

### Common Verification Gaps

Read `references/common-gaps.md` for frequently missed scenarios. (~51 lines: 6-category checklist covering input validation, error handling, state/side-effects, security, observability, edge cases, with specific items per category.)

### Artifact Lifecycle

Read `.agent/.automaton/references/ARTIFACT-LIFECYCLE.md` when state pointer or handoff rules need clarification. (~105 lines: stage handoffs table, progressive disclosure layout with allowed paths, review verdict routing, STOP conditions.)
