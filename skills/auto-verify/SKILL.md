---
name: auto-verify
description: Verify completed plan against acceptance criteria. Use after all slices are executed.
metadata:
  stage: verify
---

# auto-verify

Verification gate. Independent audit of a completed plan; runs once, not per-slice.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root. If the command fails, briefly troubleshoot the invocation or runtime path. If it runs and returns error diagnostics, report them and stop before writing artifacts.

## Preamble

Independent audit. Re-read the plan, run proof commands, and compare fresh results to acceptance criteria. It does not trust execute's self-assessment or fix what it finds. When verify continues inline from execute, execute's reasoning and slice evidence are already in context — treat them as unverified claims, re-run every command, and judge from fresh output alone. Continuation must never soften the audit.

Loading discipline: one PLAN.md read + verification commands per criterion. Read source files when verifying correctness requires inspecting the actual changes, not just command output.

## Quality Gate

Before writing the verification report:
- Tie every result to fresh command output or direct observation.
- Name skipped checks explicitly. Omission is not a pass.
- Treat partial evidence as FAIL for the plan.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when the report sounds confident without proof.

## Do

### Load State

Read the canonical `PLAN.md`. Load only linked `slices/slice-NNN.md` files and referenced requirement IDs from `spec/*.md`; Linked detail file and traceability IDs are normative, and an unlinked supplemental file is not verification context. For prose slices, read `references/content-verification.md`.

### Mark Verify Stage

After `PLAN.md` resolves and before running commands, run `node .agent/.automaton/scripts/sync-status.mjs --stage verify` from the project root. Do not edit `current.json` by hand.

### Collect Acceptance Criteria

Gather every acceptance criterion and verification command from every slice in PLAN.md. Build a checklist: slice name → criterion → command. This is a plan-level audit.

<GATE>

Do NOT modify source code, tests, or project artifacts during verification. Verify reads and runs commands; it does not fix.
</GATE>

### Run Verification

Execute verification commands for each criterion. Mark each PASS, FAIL, or PARTIAL. If a criterion lacks a command, derive one from the acceptance criterion and document what you ran. For content slices, verify audience, thesis, voice, content anti-goals, channel, source policy, factual risk, format, and anti-slop scan with evidence.

### Evaluate

Binary: the plan passes only when every criterion across all slices passes. One FAIL means the plan fails.

### Report

Build the full criterion checklist internally. Use `references/verification-template.md` for report shape. Summarize passing criteria by slice; expand failures, skipped checks, derived commands, PARTIAL results, or small 1-2 criterion plans.

### On Pass

- Run `node .agent/.automaton/scripts/sync-status.mjs --stage verified` from the project root.
- If `.agent/steering/ROADMAP.md` exists, mark the matching `change:` phase `status: done` per `.agent/.automaton/references/ROADMAP-CONTRACT.md`; skip empty or non-matching phases.
- End the report with `Change status: complete` and a separate `New objective` line pointing to `auto-office-hours` for future work. Do not print a `Recommended next skill` line on PASS. Use `auto-resume` only for later re-entry or recovery.

### On Fail

Annotate failed slices in `PLAN.md` with structured gap blocks, then run `node .agent/.automaton/scripts/sync-status.mjs --stage execute` from the project root so re-entry resumes gap fixing.
Each gap block needs `VERIFY-GAP`, evidence, and a fix objective. Recommend `auto-execute`; it reads these annotations on re-entry.

## Output

- Inline verification report; `PLAN.md` annotated with `VERIFY-GAP` blocks on failure
- State recorded through `sync-status.mjs`: `stage: verify` when verification starts, `stage: verified` on pass, or `stage: execute` on fail
- `.agent/steering/ROADMAP.md` phase marked done on pass when applicable
- Diagnostic handling: `error`-level diagnostics block the verification run; `warning`-level findings surface to the report
- PASS closeout: report `Change status: complete` and `New objective: use auto-office-hours`; do not emit `Recommended next skill`
- FAIL closeout: stop and recommend `auto-execute` — gap-fixing re-enters code changes, so the user or host invokes it.

## Rules

- Fresh evidence only. Do not rely on execution-session memory or prior verification results.
- Binary evaluation. Partial evidence is FAIL for the plan.
- Do not fix during verification; report gaps and return to execute.
- Verify the full plan: all slices, all criteria. Derive missing commands from acceptance criteria and document them.
- Do not print a long pass transcript. Expand only failures, skipped checks, derived commands, or user-requested detail.

## Deep

### Verification Report Template

Read `references/verification-template.md` for extended format guidance. (~43 lines: grouped-by-slice report format with Criterion/Result/Evidence/Gap per entry; PASS/FAIL summary shapes; rules on evidence requirements and PARTIAL counting as FAIL.)

### Common Verification Gaps

Read `references/common-gaps.md` for frequently missed scenarios. (~51 lines: 6-category checklist covering input validation, error handling, state/side-effects, security, observability, edge cases, with specific items per category.)

### Artifact Lifecycle

Read `.agent/.automaton/references/ARTIFACT-LIFECYCLE.md` when state pointer or handoff rules need clarification. (~105 lines: stage handoffs table, progressive disclosure layout with allowed paths, review verdict routing, STOP conditions.)
