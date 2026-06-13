---
name: auto-verify
description: Verify completed plan against acceptance criteria. Use after all slices are executed.
metadata:
  stage: verify
---

# auto-verify

Verification gate. Independent audit of a completed plan; runs once, not per-slice.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root.

## Preamble

Independent audit. Re-read the plan, run proof commands, and compare fresh results to acceptance criteria. It does not trust execute's self-assessment or fix what it finds. When continuing inline from execute, re-derive from fresh command output; execute's reasoning is context, not evidence.

Loading discipline: one PLAN.md read + verification commands per criterion. Read source files when verifying correctness requires inspecting the actual changes, not just command output.

## Quality Gate

Before writing the verification report:
- Tie every result to fresh command output or direct observation.
- Name skipped checks explicitly. Omission is not a pass.
- Treat partial evidence as FAIL for the plan.
- Read `references/quality.md` when the report sounds confident without proof.

## Do

### Load State

Read the canonical `PLAN.md`. Load only linked `slices/slice-NNN.md` files and referenced requirement IDs from `spec/*.md`; Linked detail file and traceability IDs are normative, and an unlinked supplemental file is not verification context. For prose slices, read `references/content-verification.md`.

### Mark Verify Stage

After `PLAN.md` resolves and before running commands, run `node .agent/.automaton/scripts/sync-status.mjs --stage verify` from the project root.

### Collect Acceptance Criteria

Gather every acceptance criterion and verification command from every slice in PLAN.md. Build a checklist: slice name → criterion → command. This is a plan-level audit.

<GATE>

Do NOT modify source code, tests, or project artifacts during verification. Verify reads and runs commands; it does not fix.

Do NOT run any `git` write command (`commit`, `amend`, `reset`, `rebase`, `branch`, `checkout`, `worktree`, `push`). The commit rhythm is owned by `auto-execute` (see `.agent/.automaton/references/ARTIFACT-LIFECYCLE.md`, Git Rhythm). Markdown writes that verify produces (`VERIFY-GAP` blocks on FAIL, the `## Verification` section and ROADMAP phase update on PASS, one-line `LEARNINGS.md` facts) sit in the working tree; `auto-execute` sweeps them up on re-entry, or the user closes them after a terminal pass.
</GATE>

### Run Verification

Execute verification commands for each criterion. Mark each PASS, FAIL, or PARTIAL. If a criterion lacks a command, derive one from the acceptance criterion and document what you ran. For content slices, verify audience, thesis, voice, content anti-goals, channel, source policy, factual risk, format, and anti-slop scan with evidence.

### Evaluate

Binary: the plan passes only when every criterion across all slices passes. One FAIL means the plan fails.

### Report

Build the full criterion checklist internally. Use `references/verification-template.md` for report shape. Summarize passing criteria by slice; expand failures, skipped checks, derived commands, PARTIAL results, or small 1-2 criterion plans.

### On Pass

- Append a compact `## Verification` section to the canonical `PLAN.md` (append-replace, never stack): per-slice criterion rollup, commands run, derived or skipped checks named, and the PASS verdict. Use the durable-record shape in `references/verification-template.md`. This is the record a future change or auditor reads; the inline report evaporates with the conversation.
- Run `node .agent/.automaton/scripts/sync-status.mjs --stage verified` from the project root.
- If `.agent/steering/ROADMAP.md` exists, mark the matching `change:` phase `status: done` per `.agent/.automaton/references/ROADMAP-CONTRACT.md`; skip empty or non-matching phases. The ROADMAP edit lands in the working tree as a markdown leftover; do not commit it. The user closes it in their own rhythm.
- End the report with `Change status: complete` and a separate `New objective` line pointing to `auto-office-hours` for future work. Do not print a `Next:` line on PASS. Use `auto-resume` only for later re-entry or recovery.

### On Fail

Before annotating, check each failing criterion for an existing `VERIFY-GAP` block from a prior verification of this change. A repeat means the gap-fix cycle did not close it: the plan or spec is the suspect, not the implementation.

- First failure: annotate failed slices in `PLAN.md` with structured gap blocks, run `node .agent/.automaton/scripts/sync-status.mjs --stage execute` from the project root so re-entry resumes gap fixing, and hand off with `Next: auto-execute`, which reads these annotations on re-entry.
- Repeated failure of the same criterion: annotate, run `node .agent/.automaton/scripts/sync-status.mjs --stage plan` from the project root, and hand off with `Next: auto-plan`, naming the repeated criterion.

Each gap block needs `VERIFY-GAP`, evidence, and a fix objective. Append-replace (`FRAMEWORK.md`, Artifact Signal Discipline): replace prior `VERIFY-GAP` blocks for the same slice rather than stacking.

When gap diagnosis reveals durable project truth beyond this change, append a one-line evidence-cited fact to `.agent/wiki/LEARNINGS.md` per `.agent/.automaton/references/ARTIFACT-LIFECYCLE.md` (Learned Truth).

## Output

- Inline verification report; `PLAN.md` annotated with `VERIFY-GAP` blocks on failure, or closed with a durable `## Verification` section on pass
- State recorded in `current.json` through `sync-status.mjs`: `stage: verify` when verification starts, `stage: verified` on pass, `stage: execute` on fail, or `stage: plan` on a repeated fail of the same criterion
- `.agent/steering/ROADMAP.md` phase marked done on pass when applicable
- Warning-level findings surface to the verification report.
- PASS closeout: report `Change status: complete` and `New objective: use auto-office-hours`; no `Next:` line
- FAIL closeout: **Next:** auto-execute, gap-fix re-enters code. A repeated failure of the same criterion escalates to **Next:** auto-plan instead.

## Rules

- Fresh evidence only. Do not rely on execution-session memory or prior verification results.
- Binary evaluation. Partial evidence is FAIL for the plan.
- Verify the full plan: all slices, all criteria. Derive missing commands from acceptance criteria and document them.
- Verify what the plan requires; flag an unmentioned common gap (input validation, concurrency, security, etc.) only when obviously critical to the change.
- No git writes. `auto-verify` never runs `git commit` or any history-modifying command; markdown writes (`VERIFY-GAP`, ROADMAP phase update) sit in the working tree until `auto-execute` re-entry sweeps them up on FAIL or the user closes them on PASS.
- Do not print a long pass transcript. Expand only failures, skipped checks, derived commands, or user-requested detail.
