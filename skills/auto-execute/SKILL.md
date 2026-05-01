---
name: auto-execute
description: Execute approved PLAN.md slices directly or through host-native subagents without reopening product scope. Use as the execute-stage entry point after planning.
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: execute
  role: controller
---

# auto-execute

Execute approved `PLAN.md` slices directly or through host-native subagents without reopening product scope. Use this as the execute-stage entry point after planning.

First action: run `scripts/get-context.mjs` from this skill's installed directory to load active change, stage, and review status.

## Preamble

auto-execute is the execute-stage orchestrator. It owns route selection, state, and scope. It executes one verified slice at a time inside a selected execution window. Direct implementation and subagent implementation are two routes inside this skill; the user should not have to switch skills to get the subagent route.

Context budget: hold only the active slice, execution-window metadata, acceptance criteria, route metadata, verification commands, and files you are actively editing or coordinating. Subagents receive curated slice context, not the whole plan.

## Quality Gate

Before marking a slice complete:
- Keep edits inside the active slice.
- Remove obvious comments, needless abstraction, and defensive boilerplate.
- Record verification evidence before advancing state.
- Read `references/quality.md` when the diff touches code, tests, docs, or project artifacts.

## Prerequisites

Before using this skill:
- `canonical_plan` in `.agent/.automaton/state/current.json` must point to an approved `PLAN.md`.
- The next executable slice must have an objective, execution route, touched files or areas, acceptance criteria, and verification command.
- If `engineering_review` is `needs_correction`, stop and return to `auto-plan`.

## Do

### 1. Load State

Read `.agent/steering/STATUS.md`. Read the canonical `PLAN.md`. Read `references/ARTIFACT-LIFECYCLE.md` for execute-stage handoff and state pointer boundaries.

If `engineering_review` is `approved_with_risks`, surface the review rationale before starting, but block only when the risk affects the current slice.

If the current slice drafts, rewrites, edits, outlines, audits, or verifies prose, read `references/content-execution.md` before changing the artifact. Content execution stays inside the same direct/subagent route selection; it is not a separate skill.

### 2. Select Execution Window

Identify the next uncompleted slice from `PLAN.md`. Then form the smallest safe execution window:
- Always include the next uncompleted slice.
- Add following slices only while the previous slice has `Auto-continue: yes`, dependencies are met, verification is explicit, and no checkpoint, risk, or context pressure appears.
- Execute the window serially by default. Cross-slice parallel dispatch is allowed only when `PLAN.md` explicitly marks slices parallel-safe and write sets are disjoint.

For each slice in the window, extract only:
- objective
- `Execution: direct | subagent recommended | subagent required`
- dependencies or ordering constraints
- touched files, directories, or subsystems
- relevant constraints and anti-goals
- acceptance criteria
- verification commands
- `Auto-continue: yes | no`

If a material slice is missing acceptance criteria or verification, stop and recommend `auto-plan`. If `Execution` is missing, infer conservatively for this session and record a plan correction.

For content slices, also extract artifact target, audience, thesis, voice, content anti-goals, channel, source policy, factual risk, and format. If the slice requires a missing source or factual-risk decision, stop with `NEEDS_CONTEXT`.

### 3. Choose Execution Route

<EXECUTION-ROUTING>

Route from the slice metadata and live conditions:
- `direct`: the slice touches ≤ 3 files in one subsystem, has no review risks, and fits in the parent session.
- `subagent recommended`: prefer the subagent route when any of these hold — the slice touches > 3 files, crosses subsystem boundaries, modifies shared interfaces or data schemas, or carries an `approved_with_risks` review verdict that affects this slice. Fall back to direct only when the host cannot dispatch subagents and the slice remains safe.
- `subagent required`: use the subagent route. Do not implement directly.

Override: use the subagent route when the user explicitly requests multi-agent execution.

The route decision lives here. Do not tell the user to invoke another execute skill for the same slice.
</EXECUTION-ROUTING>

### 4. Direct Route

Use this route only when route selection permits direct execution.

Change code and project artifacts in the order the slice requires. Keep diffs small, local, and easy to verify. Before fixing a bug, investigate the root cause.

For prose artifacts, follow `references/content-execution.md`: preserve source traceability, do not invent facts, and run the local anti-slop pass before marking the slice complete.

### 5. Subagent Route

Use this route when `Execution` is `subagent required`, when `subagent recommended` is justified, or when the user requested multi-agent execution.

The subagent route remains per-slice even when the execution window contains multiple slices.

Before dispatching, read `references/HOST-TOOLS.md`, `references/SUBAGENT-PROTOCOL.md`, and the prompt templates in `references/implementer-prompt.md`, `references/spec-reviewer-prompt.md`, and `references/code-quality-reviewer-prompt.md`.

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

### 6. Verify And Advance

Run the narrowest useful checks as soon as they can fail. Prefer targeted checks over full-suite rituals until the slice is stable.

Examples:
- If you changed one function, run the test for that function, not the whole suite.
- If you changed a route handler, curl that route, not every endpoint.
- If you changed a migration, verify it applies and rolls back, then verify the schema.

Record completion evidence in the plan or orchestration artifact before moving to another slice. Update `.agent/.automaton/state/current.json` to the next slice or stage only after the slice has evidence.

Continue within the selected execution window only when:
- The completed slice has `Auto-continue: yes`.
- Verification passed.
- The next slice's dependencies are met.
- The next slice still matches the approved plan.
- Context remains healthy.

Otherwise stop with the next action and the stop reason.

### 7. Record Corrections

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

Before fixing, investigate. No fixes without root cause.

1. **Reproduce.** Confirm the bug is real and deterministic.
2. **Isolate.** Find the smallest input or state that triggers it.
3. **Hypothesize.** Form a theory about the root cause.
4. **Verify.** Test the hypothesis with a targeted experiment.
5. **Fix.** Only after the root cause is confirmed.
6. **Regress.** Verify the fix and ensure no existing behavior broke.

If you cannot isolate the root cause within 3 attempts, escalate with what you observed, what you tried, and what you need to proceed.
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
- Execution window stop reason when continuation stops
- Newly discovered risks or follow-ups
- Recommended next skill: `auto-execute`, `auto-verify`, or `auto-plan`

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

Read `references/SUBAGENT-PROTOCOL.md` only when the subagent route is selected.

### Host Tools

Read `references/HOST-TOOLS.md` only when dispatching host-native subagents.

### Implementer Prompt

Read `references/implementer-prompt.md` when dispatching the implementer.

### Spec Reviewer Prompt

Read `references/spec-reviewer-prompt.md` after implementation status is acceptable.

### Quality Reviewer Prompt

Read `references/code-quality-reviewer-prompt.md` only after spec compliance is approved.

### Stop Condition Examples

Read `references/stop-examples.md` for concrete examples of when to halt vs. when to push through.

### Debug Protocol Details

Read `references/debug-protocol.md` for extended debugging guidance, including common root cause patterns by technology stack.

### Context Budget

Read `references/CONTEXT-BUDGET.md` for progressive loading rules and degradation tiers.
