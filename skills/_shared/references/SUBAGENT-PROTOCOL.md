# Subagent Protocol

Use this protocol when `auto-execute` chooses the subagent route for one approved plan slice. It defines shared semantics only; host-specific tool calls live in `HOST-TOOLS.md`, and static role bodies live in the host-native agent definitions sourced from `automaton/skills/auto-execute/role-sources/*-role.md`. This file does not author role system prompts.

## Roles

| Role | Host-native agent | Responsibility |
|------|-------------------|----------------|
| Coordinator | (primary agent running `auto-execute`) | Owns scope, state, route selection, dispatch packets, loop limits, integration, and final artifacts. |
| Implementer | `automaton-implementer` | Implements exactly one plan slice from coordinator-provided context and returns evidence. |
| Spec reviewer | `automaton-spec-reviewer` | Checks actual implementation against the slice, SPEC, and PLAN; rejects missing or extra scope. |
| Quality reviewer | `automaton-quality-reviewer` | Checks maintainability, tests, and regression risk only after spec review passes. |

The coordinator does not outsource scope ownership. Subagents receive curated slice context, not the full `PLAN.md`, full conversation, or unrelated work history.

This protocol is per-slice. `auto-execute` owns execute-stage orchestration across slices; this protocol owns only the implementer and reviewer loop for the selected slice. The `automaton-librarian` is deliberately not in the roster above: it is a cross-stage, read-only one-shot lookup governed by `LIBRARIAN.md`, so the dispatch rules below name only the three execute-stage agents.

## Dispatch Packet

Every subagent call should include a compact packet:

- role and requested status vocabulary
- current slice objective
- acceptance criteria or verification commands
- relevant constraints and anti-goals
- named files or areas to inspect
- edit scope: files or directories the implementer may modify (unlisted paths are read-only)
- requested changes from the prior review when the implementer is being re-dispatched after `CHANGES_REQUESTED`
- expected output structure
- stop conditions for missing context, ambiguity, or unsafe scope expansion

Do not ask a subagent to rediscover the whole project unless exploration is the assigned slice. If a subagent needs more context, provide one targeted correction before escalating.

## Dispatch Rules

- Use subagents only when `auto-execute` selects the subagent route.
- Enter this protocol from `auto-execute`; do not make framing, resume, or product review multi-agent by default.
- Dispatch only by named host-native agent (`automaton-implementer`, `automaton-spec-reviewer`, `automaton-quality-reviewer`). Do not paste a role body into a generic worker, explorer, or other host agent at runtime; the named agent's installed definition already carries the role body.
- The coordinator provides full task text for the current slice and relevant constraints. Do not make subagents rediscover the whole plan.
- Dispatch implementers sequentially by default. Cross-slice parallel dispatch is allowed only when `PLAN.md` explicitly marks slices parallel-safe, dependencies are independent, and write sets are disjoint; in a git repo it also requires worktree isolation (see Parallel Isolation).
- Review order is mandatory: spec compliance first, code quality second.
- The coordinator does not implement directly while host-native subagent execution is viable.
- If the host mapping is unclear, follow `HOST-TOOLS.md`. Do not invent a universal SDK or CLI.
- If the host cannot expose one of the named agents (configuration disabled, permission denied, capability missing), stop under the "Host does not expose subagent support" condition below. Do not fall back to runtime-curated prompt injection.

## Completion Is Evidence, Not Signal

A subagent's completion signal is an event, not proof. The working tree is the authority: verify the promised deliverable (changed files, status envelope, review verdict) exists before acting on it. A `DONE` with no matching file changes is a failure to surface, not a success to record. The reverse also holds: when a host drops or garbles the completion signal but the deliverable is present and verifiable, proceed from the evidence instead of blocking on the signal.

## Parallel Isolation

Cross-slice parallel dispatch requires worktree isolation when the project is a git repo: the coordinator creates one worktree per parallel implementer (host-native isolation where the host provides it), integrates each result serially in plan order, and removes the worktree afterwards. Disjoint write sets remain required in the plan; the worktree makes that claim structural instead of hoped. Serial dispatch stays in the main tree. Without git, parallel dispatch is allowed only on disjoint write sets, as before. Integration mechanics live in `auto-execute/references/git-rhythm.md` (Parallel Isolation).

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
| `BLOCKED` | Subagent cannot complete the slice. | Triage the cause (below) before reacting. |

`BLOCKED` triage: diagnose the cause, never re-dispatch unchanged work and hope. A context gap gets one targeted correction and a redispatch. A capability gap (the slice needs deeper reasoning than the dispatched agent showed) falls back to the direct route in the coordinator's own session. A too-large slice returns to `auto-plan` to split. A wrong plan stops for the user.

Reviewers return exactly one status:

| Status | Meaning | Coordinator action |
|--------|---------|--------------------|
| `APPROVED` | Review passed. | Continue to next review or finish. |
| `CHANGES_REQUESTED` | Fixes are required. | Pass the issues to the implementer in the `<requested-changes>` slot, then re-review. |
| `BLOCKED` | Reviewer cannot evaluate with available evidence. | Stop and report missing evidence. |

## Artifact Expectations

Use orchestration artifacts only for subagent routes or complex review loops where the details would pollute `PLAN.md` or a linked slice detail file. The slice's durable status still belongs in `PLAN.md` or `slices/slice-NNN.md`; orchestration files are supporting evidence.

Write the summary first. Future coordinators should read `slice-NNN-summary.md` before any role-specific file.

```text
.agent/work/<change>/orchestration/
  slice-001-summary.md
  slice-001-implementer.md
  slice-001-spec-review.md
  slice-001-quality-review.md
```

`slice-NNN-summary.md` should contain only:
- final status and decision
- changed files
- verification commands and results
- reviewer verdicts
- unresolved risks or next action

Role files are optional. Write them only when needed to debug, rerun, or explain a non-obvious decision.

Never paste full source files, full command logs, or chat transcripts unless needed to explain a blocker. Summarize with file paths, line anchors when available, commands run, command results, and unresolved risks.

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
