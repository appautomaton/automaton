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

auto-execute is the execute-stage orchestrator. It owns route selection, state, and scope. It executes one verified slice at a time inside a selected execution window. Continuation is the default after a verified slice; checkpoints and STOP conditions are the exceptions. Direct implementation and subagent implementation are two routes inside this skill; the user should not have to switch skills to get the subagent route.

Context budget: hold only the active slice, execution-window metadata, acceptance criteria, route metadata, verification commands, and files you are actively editing or coordinating. Subagents receive curated slice context, not the whole plan.

## Quality Gate

Before marking a slice complete:
- Keep edits inside the active slice.
- Remove obvious comments, needless abstraction, and defensive boilerplate.
- Record verification evidence before advancing state.
- Read `references/quality.md` (~37 lines: anti-patterns, better shape, prose hygiene scan patterns) when the diff looks clever or defensive rather than inevitable from the plan.

## Prerequisites

Before using this skill:
- `canonical_plan` in `.agent/.automaton/state/current.json` must point to an approved `PLAN.md`.
- The next executable slice must have an objective, acceptance criteria, and verification command. If `Execution`, `Depends on`, `Checkpoint after`, or checkpoint reason are omitted, use the documented defaults.
- If `engineering_review` is `needs_correction`, stop and return to `auto-plan`.

## Do

### Load State

Read `.agent/steering/STATUS.md`. Read the canonical `PLAN.md`.

If `PLAN.md` contains `VERIFY-GAP` annotations from a prior verification failure, treat the gap fix objectives as the current work before selecting the next uncompleted slice.

If `engineering_review` is `approved_with_risks`, surface the review rationale before starting, but block only when the risk affects the current slice.

If the current slice involves prose, read `references/content-execution.md` (~62 lines: execution contract with required inputs, factual-risk gate, 5-step drafting loop, anti-slop pass patterns, output discipline) before changing the artifact. Content execution stays inside the same direct/subagent route selection; it is not a separate skill.

If the current slice links a `slices/slice-NNN.md` detail file or names requirement IDs whose detail lives in `spec/*.md`, load only those linked files for the active slice. Do not load every supplemental file for the change.

### Select Execution Window

Identify the next uncompleted slice from `PLAN.md`. Then form the smallest safe execution window:
- Always include the next uncompleted slice.
- Add following slices while the previous slice has or defaults to `Checkpoint after: none`, dependencies are met, verification is explicit, and no STOP condition, slice-blocking review risk, or context pressure appears.
- Execute the window serially by default. Cross-slice parallel dispatch is allowed only when `PLAN.md` explicitly marks slices parallel-safe and write sets are disjoint.

Before treating a checkpoint as a window boundary, apply the checkpoint-validity rules in `Verify And Advance`. Invalid checkpoint text is a plan correction, not a pause; treat that slice as `Checkpoint after: none` for window construction.

Slice defaults:
- Missing `Execution` means `direct`.
- Missing `Depends on` means `none`.
- Missing `Checkpoint after` means `none`.
- Missing checkpoint reason means `none`.

For each slice in the window, extract only:
- objective
- `Execution: direct | subagent recommended | subagent required`
- dependencies or ordering constraints
- touched files, directories, or subsystems
- relevant constraints and anti-goals
- acceptance criteria
- verification commands
- `Checkpoint after: none | human-verify | decision | human-action`
- checkpoint reason
- linked detail files and traceability IDs, if present

If a material slice is missing acceptance criteria or verification, stop and recommend `auto-plan`.

For content slices, also extract artifact target, audience, thesis, voice, content anti-goals, channel, source policy, factual risk, and format. If the slice requires a missing source or factual-risk decision, stop with `NEEDS_CONTEXT`.

### Choose Execution Route

<EXECUTION-ROUTING>

Route from the slice metadata and live conditions:
- `direct`: the slice touches ≤ 3 files in one subsystem, has no review risks, and fits in the parent session.
- `subagent recommended`: prefer the subagent route when any of these hold: the slice touches > 3 files, crosses subsystem boundaries, modifies shared interfaces or data schemas, or carries an `approved_with_risks` review verdict that affects this slice. Fall back to direct only when the host cannot dispatch subagents and the slice remains safe.
- `subagent required`: use the subagent route. Do not implement directly.

Override: use the subagent route when the user explicitly requests multi-agent execution.

The route decision lives here. Do not tell the user to invoke another execute skill for the same slice.
</EXECUTION-ROUTING>

### Direct Route (when route = direct)

Use this route only when route selection permits direct execution.

Change code and project artifacts in the order the slice requires. Keep diffs small, local, and easy to verify. Before fixing a bug, investigate the root cause.

For prose artifacts, follow `references/content-execution.md`: preserve source traceability, do not invent facts, run anti-slop pass before completion.

### Subagent Route (when route = subagent)

Use this route when `Execution` is `subagent required`, when `subagent recommended` is justified, or when the user requested multi-agent execution.

The subagent route remains per-slice even when the execution window contains multiple slices.

Before dispatching, read `references/SUBAGENT-PROTOCOL.md` (roles, dispatch packet, status vocabulary, stop conditions) and the prompt templates in `references/implementer-prompt.md`, `references/spec-reviewer-prompt.md`, and `references/code-quality-reviewer-prompt.md`. Read `references/HOST-TOOLS.md` for host-specific subagent tool mappings.

If host tools say subagents are unavailable:
- For `subagent recommended`, fall back to direct execution only if the slice remains safe.
- For `subagent required`, stop and recommend `auto-plan` or a host/configuration change.

Run the per-slice protocol:
1. Build a dispatch packet from the current slice only.
2. Dispatch the implementer subagent.
3. If the implementer returns `NEEDS_CONTEXT`, provide one targeted context correction and redispatch once.
4. If the implementer returns `DONE` or acceptable `DONE_WITH_CONCERNS`, dispatch the spec reviewer.
5. If spec review is `APPROVED`, dispatch the quality reviewer.
6. If a reviewer requests changes, send the concrete issues to an implementer subagent and re-review once for the same issue.
7. Record an orchestration summary under `.agent/work/<change>/orchestration/` with statuses, evidence, commands, risks, and blockers.

Do not mark the slice complete unless implementer status is acceptable, spec review is `APPROVED`, quality review is `APPROVED`, and verification evidence exists or `auto-verify` is explicitly recommended.

### Verify And Advance

Run the narrowest useful checks as soon as they can fail. Prefer targeted checks over full-suite rituals until the slice is stable.

Examples:
- If you changed one function, run the test for that function, not the whole suite.
- If you changed a route handler, curl that route, not every endpoint.
- If you changed a migration, verify it applies and rolls back, then verify the schema.

Record completion evidence in the plan or orchestration artifact before moving to another slice. The next slice is selected from `PLAN.md`; do not invent slice cursor or checkpoint fields in `.agent/.automaton/state/current.json`. Change `.agent/.automaton/state/current.json` only when the stage, active change, review state, or canonical artifact pointers change.

If the completed slice has a checkpoint, validate that it actually requires human input:
- `human-verify` is valid only when the result cannot be verified by available commands, tests, host tools, or local inspection.
- `decision` is valid only when the checkpoint reason names a concrete question and options whose answer changes the next slice, architecture, design, product scope, or risk posture.
- `human-action` is valid only when progress requires an external action the agent cannot perform.

Do not pause for checkpoint text that only records verification findings, implementation caveats, downstream consequences, known limitations, or a recommendation for the next already-approved slice. Record a plan correction, keep the evidence, and continue when the normal continuation conditions pass.

Continue within the selected execution window only when:
- The completed slice has or defaults to `Checkpoint after: none`, or an invalid checkpoint was recorded as a plan correction.
- Verification passed.
- The next slice's dependencies are met.
- The next slice still matches the approved plan.
- Context remains healthy.
- No STOP condition applies.

If all slices are complete and no STOP condition applies, the change is ready for verification. Report the execution summary, ensure slice evidence is recorded, and recommend `auto-verify` as the next skill. The user or host may invoke `auto-verify` directly; auto-execute does not require nested skill invocation.

If the checkpoint is valid, pause with the next action and checkpoint reason. If a STOP condition appears, stop with the next action and stop reason.

### Record Corrections (if mismatch found)

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
Investigate root cause before fixing. Escalate after 3 failed attempts with observations, attempts, and what you need. Read `references/debug-protocol.md` (~53 lines: root cause patterns by stack, investigation techniques, escalation template) for extended guidance.
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
- Recommended next skill: `auto-execute` (slices remain), `auto-verify` (all slices complete), or `auto-plan` (structural failure). The user or host invokes the next skill; auto-execute does not require nested invocation.

## Rules

- auto-execute owns execute-stage orchestration; subagent coordination is an internal per-slice route.
- Build an execution window, but execute and verify one slice at a time.
- Serial execution is the default; parallel cross-slice dispatch requires explicit plan approval and disjoint write sets.
- Do not silently redefine the plan. Record corrections transparently.
- Stop and reframe when the approved slice is no longer valid.
- Prefer targeted checks over full-suite rituals until the slice is stable.
- Warn on review state but do not block execution unless the risk is slice-blocking.
- Hold only the active slice, execution-window metadata, acceptance criteria, route metadata, and active files in context.
- Use host-native subagents; do not invent a universal SDK or CLI.
- Review order is strict when subagents are used: spec compliance before code quality.
- Before fixing, investigate. No fixes without root cause.

## Deep

### Subagent Protocol

Read `references/SUBAGENT-PROTOCOL.md` only when subagent route is selected. (~95 lines: roles, dispatch packet schema, dispatch/review rules, status vocabulary with 4 implementer + 3 reviewer statuses, stop conditions.)

### Host Tools

Read `references/HOST-TOOLS.md` only when dispatching subagents. (Host-specific tool mappings for Claude/Codex/OpenCode subagent dispatch.)

### Implementer Prompt

Read `references/implementer-prompt.md` to dispatch the implementer. (~63 lines: complete prompt template with rules, self-review checklist, and `STATUS/SUMMARY/FILES_CHANGED/VERIFICATION/CONCERNS/NEEDS` return structure.)

### Spec Reviewer Prompt

Read `references/spec-reviewer-prompt.md` after implementation is acceptable. (~41 lines: prompt template with 6 spec-compliance checks and `STATUS/SUMMARY/ISSUES/EVIDENCE` return structure.)

### Quality Reviewer Prompt

Read `references/code-quality-reviewer-prompt.md` after spec compliance is approved. (~43 lines: prompt template with severity labels `critical/important/minor`, 7 quality checks, and return structure.)

### Stop Condition Examples

Read `references/stop-examples.md` for when to halt vs. push through. (~29 lines: 5 halt scenarios, 4 push-through scenarios, one decision rule: trivial → fix; structural → halt.)

### Debug Protocol Details

Read `references/debug-protocol.md` for root cause patterns by stack. (~53 lines: common patterns for Node/Python/Rust/General, 4 investigation techniques, escalation template with Observed/Expected/Tried/Need structure.)

### Context Budget

Read `references/CONTEXT-BUDGET.md` for progressive loading and degradation tiers. (~76 lines: 4 principles, 6-step loading order, 4 degradation tiers with behavioral rules, no-re-read rule with exceptions.)

### Artifact Lifecycle

Read `references/ARTIFACT-LIFECYCLE.md` when state pointer conflicts arise or progressive disclosure rules need clarification. (~70 lines: stage handoffs table, progressive disclosure layout with allowed paths, review verdict routing, STOP conditions.)
