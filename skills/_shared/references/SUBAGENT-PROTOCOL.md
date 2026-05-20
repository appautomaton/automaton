# Subagent Protocol

Use this protocol when `auto-execute` chooses the subagent route for one approved plan slice. It defines shared semantics only; host-specific tool calls live in `HOST-TOOLS.md`.

## Roles

| Role | Responsibility |
|------|----------------|
| Coordinator | `auto-execute`; owns scope, state, route selection, dispatch packets, loop limits, integration, and final artifacts. |
| Implementer | Implements exactly one plan slice from coordinator-provided context and returns evidence. |
| Spec reviewer | Checks actual implementation against the slice, SPEC, and PLAN; rejects missing or extra scope. |
| Quality reviewer | Checks maintainability, tests, and regression risk only after spec review passes. |

The coordinator does not outsource scope ownership. Subagents receive curated slice context, not the full `PLAN.md`, full conversation, or unrelated work history.

This protocol is per-slice. `auto-execute` owns execute-stage orchestration across slices; this protocol owns only the implementer and reviewer loop for the selected slice.

## Dispatch Packet

Every subagent call should include a compact packet:

- role and requested status vocabulary
- current slice objective
- acceptance criteria or verification commands
- relevant constraints and anti-goals
- named files or areas to inspect
- edit scope: files or directories the implementer may modify (unlisted paths are read-only)
- expected output structure
- stop conditions for missing context, ambiguity, or unsafe scope expansion

Do not ask a subagent to rediscover the whole project unless exploration is the assigned slice. If a subagent needs more context, provide one targeted correction before escalating.

## Dispatch Rules

- Use subagents only when `auto-execute` selects the subagent route.
- Enter this protocol from `auto-execute`; do not make framing, resume, or product review multi-agent by default.
- The coordinator provides full task text for the current slice and relevant constraints. Do not make subagents rediscover the whole plan.
- Dispatch implementers sequentially by default. Cross-slice parallel dispatch is allowed only when `PLAN.md` explicitly marks slices parallel-safe, dependencies are independent, and write sets are disjoint.
- On Codex, pass `fork_turns="none"` when spawning subagents to prevent child agents from inheriting the parent transcript and self-deadlocking on wait.
- Review order is mandatory: spec compliance first, code quality second.
- The coordinator does not implement directly while host-native subagent execution is viable.
- If the host mapping is unclear, follow `HOST-TOOLS.md`. Do not invent a universal SDK or CLI.

## Review Rules

- Spec reviewers do not trust implementer reports. They inspect changed files, command evidence, or concrete observations before approving.
- Spec reviewers focus on required behavior, acceptance criteria, and extra scope. They do not perform general maintainability review.
- Quality reviewers use severity language (`critical`, `important`, `minor`) and focus on bugs, maintainability, tests, cleanup, state, path handling, and unrelated edits.
- Quality reviewers do not reopen product scope unless a quality issue proves the implementation cannot work safely.

## Status Vocabulary

Implementers return exactly one status:

| Status | Meaning | Coordinator action |
|--------|---------|--------------------|
| `DONE` | Slice implemented and self-reviewed. | Start spec review. |
| `DONE_WITH_CONCERNS` | Slice implemented but concerns remain. | Read concerns, then decide whether to review, provide context, or stop. |
| `NEEDS_CONTEXT` | Subagent cannot proceed without information. | Provide missing context and redispatch. |
| `BLOCKED` | Subagent cannot complete the slice. | Stop, report blocker, and recommend `auto-plan` or user clarification. |

Reviewers return exactly one status:

| Status | Meaning | Coordinator action |
|--------|---------|--------------------|
| `APPROVED` | Review passed. | Continue to next review or finish. |
| `CHANGES_REQUESTED` | Fixes are required. | Send issues to implementer, then re-review. |
| `BLOCKED` | Reviewer cannot evaluate with available evidence. | Stop and report missing evidence. |

## Artifact Expectations

Record important outcomes under the active change, for example:

```text
.agent/work/<change>/orchestration/
  slice-001-implementer.md
  slice-001-spec-review.md
  slice-001-quality-review.md
  slice-001-summary.md
```

Artifacts should summarize outcomes and evidence. They should not duplicate full source files or full command logs unless needed to explain a blocker.

Each artifact should include enough evidence for a fresh coordinator to continue: file paths, relevant line anchors when available, commands run, command results, and unresolved risks.

## Stop Conditions

- Host does not expose subagent support or the required feature is disabled.
- The current slice has no clear acceptance criteria.
- Implementer reports `BLOCKED` after one context correction attempt.
- Implementer still reports `NEEDS_CONTEXT` after one targeted context correction.
- A reviewer requests changes twice for the same unresolved issue.
- Subagents would edit the same files concurrently.
- Cross-slice parallelism would touch shared files, schemas, migrations, or stateful setup.
- The work is trivial enough that subagent overhead exceeds value.
- A subagent proposes broad plan changes instead of completing or reviewing the current slice.
