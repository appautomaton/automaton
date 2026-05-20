---
name: auto-execute
description: Implement approved plan slices. Use as the execute-stage entry point.
metadata:
  stage: execute
---

# auto-execute

Implementation controller. Executes approved plan slices without reopening product scope.

First action: run `scripts/get-context.mjs` → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding.

## Preamble

auto-execute owns execute-stage orchestration, route selection, state, and scope. Direct implementation and subagent implementation are two routes inside this skill; the user should not have to switch skills to get the subagent route. Execute and verify one approved slice at a time inside the selected execution window. Continuation is the default after a verified slice; checkpoints and STOP conditions are the exceptions.

Context budget: keep the active slice, execution-window metadata, acceptance criteria, route metadata, verification commands, and active files in context. Load linked detail files and traceability IDs for the active slice only. Read wider project files only when implementation correctness requires it.

## Quality Gate

Before marking a slice complete:
- Keep edits inside the active slice.
- Investigate root cause before fixing bugs.
- Remove obvious comments, needless abstraction, and defensive boilerplate.
- Record verification evidence before advancing or selecting the next slice.
- Read `references/quality.md` (~37 lines) when the diff looks clever or defensive rather than inevitable from the plan.

## Prerequisites

Before using this skill:
- `canonical_plan` in `.agent/.automaton/state/current.json` must point to an approved `PLAN.md`.
- The next executable slice must have an objective, acceptance criteria, and verification command.
- If `engineering_review` is `needs_correction`, stop and return to `auto-plan`.

## Do

### Load State

Read `.agent/steering/STATUS.md` and the canonical `PLAN.md`. If `PLAN.md` contains `VERIFY-GAP` annotations from a prior verification failure, treat those gap-fix objectives as the current work before selecting the next uncompleted slice.

If `engineering_review` is `approved_with_risks`, surface the review rationale before starting, but block only when the risk affects the current slice.

If the current slice involves prose, read `references/content-execution.md` (~62 lines) before changing the artifact. Content execution stays inside the same direct/subagent route selection; it is not a separate skill.

If the current slice links a `slices/slice-NNN.md` detail file or names requirement IDs whose detail lives in `spec/*.md`, load those linked files for the active slice. Extract linked detail files and traceability IDs so implementation stays tied to the approved plan.

### Select Execution Window

Identify the next uncompleted slice from `PLAN.md`. Build the smallest safe execution window:
- Always include the next uncompleted slice.
- Add following slices only while the previous slice has or defaults to `Checkpoint after: none`, dependencies are met, verification is explicit, and no STOP condition, slice-blocking review risk, or context pressure appears.
- Execute the window serially by default. Cross-slice parallel dispatch is allowed only when `PLAN.md` explicitly marks slices parallel-safe and write sets are disjoint.

Slice defaults:
- Missing `Execution` means `direct`.
- Missing `Depends on` means `none`.
- Missing `Checkpoint after` means `none`.
- Missing checkpoint reason means `none`.

For each slice in the window, extract objective, route metadata, dependencies, touched files or subsystems, constraints and anti-goals, acceptance criteria, verification commands, checkpoint metadata, and linked detail files and traceability IDs. If a material slice is missing acceptance criteria or verification, stop and recommend `auto-plan`.

For content slices, also extract artifact target, audience, thesis, voice, content anti-goals, channel, source policy, factual risk, and format. If the slice requires a missing source or factual-risk decision, stop with `NEEDS_CONTEXT`.

### Choose Execution Route

<EXECUTION-ROUTING>

Route from slice metadata and live conditions:
- `direct`: the slice touches a small area, has no slice-blocking review risk, and fits in the parent session.
- `subagent recommended`: prefer subagents when the slice crosses subsystem boundaries, touches many files, modifies shared interfaces or data schemas, or carries an `approved_with_risks` review verdict that affects this slice.
- `subagent required`: use the subagent route. Do not implement directly.

Override: use the subagent route when the user explicitly requests multi-agent execution.

The route decision lives here. Do not tell the user to invoke another execute skill for the same slice.
</EXECUTION-ROUTING>

### Direct Route

Use this route only when route selection permits direct execution. Change code and project artifacts in the order the slice requires. Keep diffs small, local, and easy to verify. For prose artifacts, follow `references/content-execution.md`: preserve source traceability, do not invent facts, run anti-slop pass before completion.

### Subagent Route

Use this route when `Execution` is `subagent required`, when `subagent recommended` is justified, or when the user requested multi-agent execution. The subagent route remains per-slice even when the execution window contains multiple slices.

Before dispatching, read `references/SUBAGENT-PROTOCOL.md` and `references/HOST-TOOLS.md`. Use `references/implementer-prompt.md`, `references/spec-reviewer-prompt.md`, and `references/code-quality-reviewer-prompt.md` as the role prompts. If prior orchestration summaries exist under `.agent/work/<change>/orchestration/`, scan them for relevant decisions or discoveries.

If host tools say subagents are unavailable, fall back from `subagent recommended` to direct execution only if the slice remains safe. For `subagent required`, stop and recommend `auto-plan` or a host/configuration change.

Run the per-slice protocol:
1. Build a dispatch packet from the current slice only.
2. Dispatch the implementer.
3. Provide at most one targeted context correction for `NEEDS_CONTEXT`.
4. Verify expected file changes before spec review.
5. Run spec review before code-quality review.
6. Send concrete reviewer issues to an implementer once, then re-review.
7. Record an orchestration summary under `.agent/work/<change>/orchestration/`.

Do not mark the slice complete unless the implementer status is acceptable, spec review is `APPROVED`, quality review is `APPROVED`, and slice verification evidence exists. Plan-level verification happens after all slices are complete: continue directly into `auto-verify` when safe, or recommend it only when continuation is blocked.

### Verify And Advance

Run the narrowest useful checks as soon as they can fail. Prefer targeted checks over full-suite rituals until the slice is stable.

Record completion evidence in the plan or orchestration artifact before moving to another slice. The next slice is selected from `PLAN.md`; do not invent slice cursor or checkpoint fields in `.agent/.automaton/state/current.json`. Change `.agent/.automaton/state/current.json` only when the stage, active change, review state, or canonical artifact pointers change.

If the completed slice has a checkpoint, validate that it actually requires human input:
- `human-verify` is valid only when the result cannot be verified by available commands, tests, host tools, or local inspection.
- `decision` is valid only when the checkpoint reason names a concrete question and options whose answer changes the next slice, architecture, design, product scope, or risk posture.
- `human-action` is valid only when progress requires an external action the agent cannot perform.

Do not pause for checkpoint text that only records verification findings, implementation caveats, downstream consequences, known limitations, or a recommendation for the next already-approved slice. Record a plan correction, keep the evidence, and continue when the normal continuation conditions pass.

Continue within the selected execution window only when verification passed, dependencies are met, the next slice still matches the approved plan, context remains healthy, and no STOP condition applies.

If all slices are complete and no STOP condition applies, ensure slice evidence is recorded, then continue directly into the `auto-verify` verification gate in the same session when the host/session can keep working. Do not make the user run `auto-verify` manually just because execution finished. Only recommend `auto-verify` as the next skill when continuation is blocked by a valid checkpoint, context pressure, unavailable host capability, or another explicit STOP condition.

When continuing into verification, follow `auto-verify`'s contract: re-read the canonical `PLAN.md`, collect every acceptance criterion, run or derive the verification commands, and produce the verification report. Do not trust execute's own slice evidence as final verification.

If the checkpoint is valid, pause with the next action and checkpoint reason.

### Record Corrections

If implementation reveals a real mismatch between plan and reality:
- Record the correction in `PLAN.md` as a note on the current slice.
- Do NOT silently redefine the plan. A recorded correction is transparent; a silent redefinition is a bug.

<STOP>

Halt immediately and report to the user when:

1. **Blocker.** A dependency is missing and cannot be installed or resolved.
2. **Repeated failure.** A test fails repeatedly (> 3 attempts) with the same error.
3. **Ambiguous instruction.** An instruction in the plan is ambiguous or contradictory and cannot be resolved with one clarifying question.
4. **Stale plan.** The approved slice no longer matches the codebase state, such as a referenced file that was renamed or deleted.
5. **Scope creep.** The user asks for work outside the current slice. Reframe: "That's outside this slice. Should I record it as a follow-up slice, or do we need to revisit the plan?"
6. **Context pressure.** You are at the DEGRADING or EMERGENCY tier. Checkpoint progress immediately and stop new work.
7. **Unsafe subagent fallback.** The plan requires subagents but the host cannot dispatch them.

Do not guess. Do not proceed.
</STOP>

<DEBUG-PROTOCOL>
Investigate root cause before fixing. Escalate after 3 failed attempts with observations, attempts, and what you need. Read `references/debug-protocol.md` (~53 lines) for extended guidance.
</DEBUG-PROTOCOL>

<HARD-GATE>

Do NOT write code unless:
- `PLAN.md` is approved and `canonical_plan` is set.
- The current slice has explicit acceptance criteria.
- The route is direct, or the subagent route has passed its host capability check.
- If the user asks for a "quick fix" outside the plan, reframe through `auto-frame`. Do not bypass the plan.
</HARD-GATE>

## Output

- Slice(s) executed and route used: direct or subagent
- Files changed with one-line rationale per file
- Commands run and their results
- Subagent statuses and review verdicts, when used
- `.agent/.automaton/state/current.json` updated only when canonical pointers, active change, or review state change; auto-execute does not write a slice cursor field
- Execution window checkpoint or stop reason when continuation pauses
- Newly discovered risks or follow-ups
- Diagnostic handling: `error`-level diagnostics halt the slice; `warning`-level diagnostics surface to the user and the next stage
- Verification report when all slices complete and continuation is safe; otherwise recommended next skill: `auto-execute` (slices remain), `auto-verify` (execution complete but continuation blocked), or `auto-plan` (structural failure). The user or host invokes any recommended next skill; auto-execute does not require nested invocation.

## Rules

- auto-execute owns execute-stage orchestration; subagent coordination is an internal per-slice route.
- Build an execution window, but execute and verify one slice at a time.
- Serial execution is the default; parallel cross-slice dispatch requires explicit plan approval and disjoint write sets.
- Do not silently redefine the plan. Record corrections transparently.
- Stop and reframe when the approved slice is no longer valid.
- Prefer targeted checks over full-suite rituals until the slice is stable.
- Continue directly into `auto-verify` after the last slice when no valid checkpoint, STOP condition, context pressure, or host limitation blocks continuation.
- Warn on review state but do not block execution unless the risk is slice-blocking.
- Hold only the active slice, execution-window metadata, acceptance criteria, route metadata, and active files in context.
- Use host-native subagents; do not invent a universal SDK or CLI.
- Review order is strict when subagents are used: spec compliance before code quality.
- Before fixing, investigate. No fixes without root cause.

## Deep

### Subagent Protocol

Read `references/SUBAGENT-PROTOCOL.md` only when subagent route is selected. (~95 lines: roles, dispatch packet schema, dispatch/review rules, status vocabulary, stop conditions.)

### Host Tools

Read `references/HOST-TOOLS.md` only when dispatching subagents. (Host-specific tool mappings for Claude/Codex/OpenCode subagent dispatch.)

### Implementer Prompt

Read `references/implementer-prompt.md` to dispatch the implementer. (~63 lines.)

### Spec Reviewer Prompt

Read `references/spec-reviewer-prompt.md` after implementation is acceptable. (~41 lines.)

### Quality Reviewer Prompt

Read `references/code-quality-reviewer-prompt.md` after spec compliance is approved. (~45 lines.)

### Stop Condition Examples

Read `references/stop-examples.md` for when to halt vs. push through. (~29 lines.)

### Debug Protocol Details

Read `references/debug-protocol.md` for root cause patterns by stack. (~53 lines.)

### Context Budget

Read `references/CONTEXT-BUDGET.md` for progressive loading and degradation tiers. (~76 lines.)

### Artifact Lifecycle

Read `references/ARTIFACT-LIFECYCLE.md` when state pointer conflicts arise or progressive disclosure rules need clarification. (~105 lines.)
