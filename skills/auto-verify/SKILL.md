---
name: auto-verify
description: Check implemented work against the plan and user-visible outcomes with fresh evidence. Use when code or artifacts changed and completion claims need proof.
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: verify
  role: controller
---

# auto-verify

Check implemented work against the plan and user-visible outcomes with fresh evidence. Use when code or artifacts changed and completion claims need proof.

First action: run `scripts/get-context.mjs` from this skill's installed directory to load active change and stage.

## Preamble

auto-verify is the antifraud layer. It does not trust. It re-reads the plan slice, runs the proof commands, compares actual results to acceptance criteria, and reports gaps plainly. Partial evidence is not completion. Intuition is not evidence.

Context budget: one read of the plan slice + one run of verification commands. No broad scans.

## Quality Gate

Before writing `VERIFY.md` or the final verification summary:
- Tie every result to fresh command output or direct observation.
- Name skipped checks explicitly.
- Treat partial evidence as PARTIAL or FAIL, not completion.
- Read `references/quality.md` if the summary sounds confident without proof.

## Do

### 1. Load State

Read `.agent/steering/STATUS.md`. Read the canonical `PLAN.md`. Read `references/ARTIFACT-LIFECYCLE.md` for verify-stage handoff and state pointer boundaries.

If the slice creates, rewrites, edits, outlines, or audits prose, read `references/content-verification.md` and add its content checks to the verification loop.

### 2. Re-read the Slice

Identify the current slice from PLAN.md. Re-read:
- The slice objective
- The acceptance criteria
- The verification command specified in the plan

Do not rely on memory from the execution session. Fresh verification beats intuition.

### 3. Run Verification

<VERIFICATION-LOOP>

Run the verification commands specified in the plan. For each command:
1. Run it.
2. Capture the output.
3. Compare to the expected outcome.
4. Mark: PASS, FAIL, or PARTIAL.

If the plan did not specify verification commands, derive them from the acceptance criteria and run them. Document what you ran and why.

For content slices, verify audience, thesis, voice, content anti-goals, channel, source policy, factual risk, format, and anti-slop scan with evidence.
</VERIFICATION-LOOP>

### 4. Evaluate

<EVIDENCE-FIRST>

Partial evidence is not completion. A test that passes 3 out of 4 assertions is FAIL, not "mostly done." A feature that works for the happy path but fails on edge cases is FAIL, not "functional."

Evaluate each acceptance criterion as binary: met or not met. There is no "mostly met."
</EVIDENCE-FIRST>

### 5. Report

Report findings plainly:

```
## Verification: [Slice Name]

- Criterion: [acceptance criterion]
  - Result: PASS / FAIL / PARTIAL
  - Evidence: [command output or observation]
  - Gap: [what is missing, or "none"]

[Repeat for each criterion]

**Overall:** PASS / FAIL
**Remaining gaps:** [list or "none"]
**Recommended next skill:** [auto-execute | auto-resume | auto-plan]
```

### 6. Update State

If the slice is fully verified (all criteria PASS):
- Run this skill's installed `sync-status.mjs` from the same host skill root.
- Update `.agent/.automaton/state/current.json` with the next slice or stage.

If the slice has gaps:
- Do NOT update state.
- Return to `auto-execute` with the specific gaps listed.

<FAILURE-HANDLING>

When verification fails:
1. Report the failure plainly. No sugarcoating.
2. List the exact gaps. Not "some issues" — "the login endpoint returns 500 when password is empty; the test does not cover this case."
3. Recommend `auto-execute` with the specific gaps as the next slice's objective.
4. Do NOT attempt to fix during verification. Verification and execution are separate stages.
</FAILURE-HANDLING>

## Output

- Verification report (plain text or VERIFY.md for important changes)
- Commands and outcomes
- Pass/fail per criterion
- Remaining gaps
- Recommended next skill

## Rules

- Fresh verification beats intuition. Always re-read the plan slice.
- Partial evidence is not completion. Binary evaluation only.
- Keep the report factual and brief. No essays.
- Do not fix during verification. Report and return to execute.
- If verification commands are missing from the plan, derive and run them. Document what you ran.

## Deep

### Verification Report Template

Read `references/verification-template.md` for the exact markdown format.

### Common Verification Gaps

Read `references/common-gaps.md` for a checklist of commonly missed verification scenarios.

### Context Budget

Read `references/CONTEXT-BUDGET.md` for progressive loading rules and degradation tiers.
