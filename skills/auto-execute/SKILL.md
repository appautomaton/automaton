---
name: auto-execute
description: Implement approved plan slices. Use as the execute-stage entry point.
metadata:
  stage: execute
---

# auto-execute

Implementation controller. Executes approved plan slices without reopening product scope.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root. If the command fails, briefly troubleshoot the invocation or runtime path. If it runs and returns error diagnostics, report them and stop before writing artifacts.

## Preamble

auto-execute owns execute-stage orchestration, route selection, state, and scope. Direct implementation and subagent implementation are two routes inside this skill. It does not reopen product scope or modify the approved plan's intent. Execute and verify one approved slice at a time inside the selected execution window. Continuation is the default after a verified slice; checkpoints and STOP conditions are the exceptions. An execution window is a context-management batch, not a completion boundary.

Loading discipline: keep the active slice, execution-window metadata, acceptance criteria, route metadata, verification commands, and active files in context. Load linked detail files and traceability IDs for the active slice only; read wider project files only when implementation correctness requires it.

## Quality Gate

Before marking a slice complete:
- Keep edits inside the active slice.
- Investigate root cause before fixing bugs; read `references/debug-protocol.md` only when bounded diagnosis needs more structure.
- Record verification evidence before advancing or selecting the next slice.
- Read `references/quality.md` (~37 lines) when the diff looks clever, defensive, or broader than the plan requires.

## Prerequisites

Before using this skill:
- `canonical_plan` in `.agent/.automaton/state/current.json` must point to an approved `PLAN.md`.
- The next executable slice must have an objective, acceptance criteria, and verification command.
- If `engineering_review` is `needs_correction`, stop and return to `auto-plan`.

## Do

### Load State

Read the canonical `PLAN.md`. If it contains `VERIFY-GAP` annotations, treat those gap-fix objectives as the current work before selecting the next uncompleted slice.

If `engineering_review` is `approved_with_risks`, surface the rationale before starting but block only when the risk affects the current slice.

If the current slice involves prose, read `references/content-execution.md`. If it links `slices/slice-NNN.md` or requirement IDs in `spec/*.md`, load those linked files for the active slice and preserve their traceability IDs.

### Mark Execute Stage

After the canonical `PLAN.md` resolves and before changing code or project artifacts, run `node .agent/.automaton/scripts/sync-status.mjs --stage execute` from the project root. This records that the active change has entered execution while preserving the existing `canonical_plan`. Do not edit `current.json` by hand.

### Select Execution Window

The next slice is selected from `PLAN.md`. Build the smallest safe execution window:
- Always include the next uncompleted slice.
- Add following slices only while `Checkpoint after: none` is present or defaulted, dependencies are met, verification is explicit, and no STOP condition, slice-blocking review risk, or context pressure appears.
- Execute the window serially by default. Cross-slice parallel dispatch is allowed only when `PLAN.md`'s **Parallel-safe groups:** line names the slices and write sets are disjoint.

Slice defaults:
- Missing `Execution` means `direct`.
- Missing `Depends on` means `none`.
- Missing `Checkpoint after` means `none`.
- Missing checkpoint reason means `none`.

For each slice in the window, extract objective, dependencies, touched files or subsystems, constraints and anti-goals, acceptance criteria, verification commands, checkpoint metadata, route metadata, and linked detail files and traceability IDs. If a material slice is missing acceptance criteria or verification, stop and recommend `auto-plan`.

For content slices, also extract artifact target, audience, thesis, voice, content anti-goals, channel, source policy, factual risk, and format. If the slice needs a missing source or factual-risk decision, stop with `NEEDS_CONTEXT`.

### Route Selection

The route decision lives here:
- `direct`: small area, no slice-blocking review risk, fits in the parent session.
- `subagent recommended`: prefer subagents when the slice crosses subsystem boundaries, touches many files, modifies shared interfaces or data schemas, or carries a relevant `approved_with_risks` verdict.
- `subagent required`: use the subagent route. Do not implement directly.

Use the subagent route when the user explicitly requests multi-agent execution. Do not tell the user to invoke another execute skill for the same slice.

### Direct Route

Use this route only when route selection permits direct execution. Change code and project artifacts in the order the slice requires. Keep diffs small, local, and easy to verify. For prose artifacts, follow `references/content-execution.md`.

### Subagent Route

Use this route when `Execution` is `subagent required`, when `subagent recommended` is justified, or when the user requested multi-agent execution. Before dispatching, read `.agent/.automaton/references/SUBAGENT-PROTOCOL.md` and `references/HOST-TOOLS.md`; then use `references/implementer-prompt.md`, `references/spec-reviewer-prompt.md`, and `references/code-quality-reviewer-prompt.md`.

If host tools say subagents are unavailable, fall back from `subagent recommended` to direct execution only when the slice remains safe. For `subagent required`, stop and recommend `auto-plan` or a host/configuration change.

Run the per-slice protocol:
1. Build a dispatch packet from the current slice only.
2. Dispatch the implementer.
3. Provide at most one targeted context correction for `NEEDS_CONTEXT`.
4. Verify expected file changes before spec review.
5. Run spec review before code-quality review.
6. Send concrete reviewer issues to an implementer once, then re-review.
7. Record a compact orchestration summary under `.agent/work/<change>/orchestration/` only when subagent/review details are needed later. The slice status still updates in place.

Do not mark the slice complete unless implementation status is acceptable, spec review is `APPROVED`, quality review is `APPROVED`, and slice verification evidence exists.

### Verify And Advance

Run the narrowest useful checks as soon as they can fail. Prefer targeted checks over full-suite rituals until the slice is stable.

Record completion evidence in place:
- If the slice is inline in `PLAN.md`, update that slice entry in `PLAN.md`.
- If the slice has `Detail: slices/slice-NNN.md`, update that linked detail file and keep a compact `PLAN.md` pointer.
- Do not create separate execution evidence files by default.

Use this compact evidence shape:

```markdown
**Status:** complete | blocked | needs-plan-correction
**Evidence:** changed `path`; command/result; key observation.
**Risks / next:** none, or one concrete item.
```

Append-replace the evidence block. Do not paste transcripts, full command logs, or source excerpts unless needed to explain a blocker.

The next slice is selected from `PLAN.md`; do not invent slice cursor or checkpoint fields in `.agent/.automaton/state/current.json`. Change state only through `node .agent/.automaton/scripts/sync-status.mjs` when stage, active change, review state, or canonical artifact pointers change.

If the completed slice has a checkpoint, validate that it actually requires human input:
- `human-verify` is valid only when available commands, tests, host tools, and local inspection cannot verify the result.
- `decision` is valid only when the checkpoint reason names a concrete question and options whose answer changes the next slice, architecture, design, product scope, or risk posture.
- `human-action` is valid only when progress requires an external action the agent cannot perform.

Do not pause for checkpoint text that only records verification findings, implementation caveats, downstream consequences, known limitations, or a recommendation for the next already-approved slice. Record a plan correction, keep the evidence, and continue when normal continuation conditions pass.

Continue within the selected execution window only when verification passed, dependencies are met, the next slice still matches the approved plan, context remains healthy, and no STOP condition applies. If the checkpoint is valid, pause with the next action and checkpoint reason.

### Continuation And Handoff

When the selected execution window is complete but `PLAN.md` still has uncompleted approved slices, return to **Select Execution Window** immediately. "N slices remain" is progress state, not a stop reason. Remaining approved slices require another execution-window pass unless a valid checkpoint, STOP condition, context-pressure tier, or unavailable host capability prevents continuing.

If all slices are complete and no STOP condition applies, ensure slice evidence is recorded, then continue into `auto-verify`'s contract in the same session when safe. Do not make the user run `auto-verify` manually just because execution finished. When continuing, re-read the canonical `PLAN.md`, collect every acceptance criterion, run or derive verification commands, and produce the verification report. Do not trust execute's own slice evidence as final verification.

### Record Corrections

If implementation reveals a real mismatch between plan and reality, record the correction in `PLAN.md` on the current slice. Do not silently redefine the plan.

<STOP>

Halt immediately and report to the user when:
1. A dependency is missing and cannot be installed or resolved.
2. A test fails repeatedly (> 3 attempts) with the same error.
3. A plan instruction is ambiguous or contradictory and cannot be resolved with one clarifying question.
4. The approved slice no longer matches the codebase state.
5. The user asks for work outside the current slice.
6. Context pressure reaches DEGRADING or EMERGENCY.
7. The plan requires subagents but the host cannot dispatch them.
</STOP>

<GATE>

Do NOT write code unless:
- `PLAN.md` is approved and `canonical_plan` is set.
- The current slice has explicit acceptance criteria.
- The route is direct, or the subagent route has passed its host capability check.
- If the user asks for a quick fix outside the plan, reframe through `auto-frame`; do not bypass the plan.
</GATE>

## Output

- Slice(s) executed and route used: direct, subagent recommended, or subagent required.
- Files changed with one-line rationale per file.
- Commands run and results.
- Subagent statuses and review verdicts when used.
- Slice evidence updated in place: inline slice in `PLAN.md`, or linked detail file plus compact `PLAN.md` pointer.
- Execute stage recorded through `sync-status.mjs` when execution begins; no slice cursor field is added to current.json.
- Execution window checkpoint or stop reason when continuation pauses; if approved slices remain, name the valid blocker that prevents continuing.
- Diagnostic handling: error-level diagnostics block the slice; warning-level diagnostics surface to the user and the next stage.
- Verification report when all slices complete and continuation is safe; otherwise recommended next skill: `auto-execute` (slices remain), `auto-verify` (execution complete but continuation blocked), or `auto-plan` (structural failure).

## Rules

- auto-execute owns route selection and execution-window continuation.
- Build an execution window, but execute and verify one slice at a time.
- Serial execution is the default; parallel cross-slice dispatch requires explicit plan approval and disjoint write sets.
- Do not silently redefine the plan; record corrections transparently.
- Keep durable evidence in `PLAN.md` or linked `slices/slice-NNN.md`, not new evidence files by default.
- Before fixing, investigate. No fixes without root cause.

## Deep

- Read `.agent/.automaton/references/SUBAGENT-PROTOCOL.md` only when subagent route is selected.
- Read `references/HOST-TOOLS.md` only when dispatching subagents.
- Read `references/implementer-prompt.md`, `references/spec-reviewer-prompt.md`, and `references/code-quality-reviewer-prompt.md` for subagent role prompts.
- Read `references/stop-examples.md` when deciding whether to halt or push through uncertainty.
- Read `references/debug-protocol.md` for root-cause patterns after bounded diagnosis.
- Read `.agent/.automaton/references/CONTEXT-BUDGET.md` for context pressure tiers.
- Read `.agent/.automaton/references/ARTIFACT-LIFECYCLE.md` when state pointer conflicts or progressive disclosure rules need clarification.
