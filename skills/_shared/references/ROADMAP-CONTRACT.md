# Roadmap Contract

This reference defines the format, status model, and update rules for `.agent/steering/ROADMAP.md`. Load it when writing, updating, or reading roadmap phases.

## Canonical Phase Format

```
## Phase N: [Name]

- status: pending | active | done
- change: `<change-slug>` | (empty when unframed)
- objective: [bounded outcome]
- why now: [dependency or leverage justification]
- likely outputs: [deliverables]
- evidence: `[file path or command]` | user-stated
- exit signal: [how to verify the phase is complete]
```

Field order is normative. `status` and `change` appear first.

## Status Values

| Status | Meaning | Set by |
|--------|---------|--------|
| `pending` | Not yet started; queued for future work | `auto-onboard` (initial creation), `auto-office-hours` (decomposition) |
| `active` | Currently being framed, planned, or executed | `auto-office-hours` (when framing the first spec from a decomposed request) |
| `done` | All slices verified; phase complete | `auto-verify` (when the final slice of the matching change passes) |

Status progression is one-directional: `pending` → `active` → `done`. Do not reverse.

## Update Rules

| Skill | Action | When |
|-------|--------|------|
| `auto-onboard` | Fills ROADMAP.md with phases when repo evidence supports them; leaves scaffold placeholder otherwise | First-time project setup |
| `auto-office-hours` | Replaces ROADMAP.md content with the approved decomposition; sets the first spec to `status: active` with its `change:` slug | Scale is roadmap-sized and user approves an approach |
| `auto-frame` | Appends deferred scope as new `status: pending` phases | Spec is narrower than the user's stated goal |
| `auto-verify` | Sets matching phase to `status: done` | Final slice of the plan passes all criteria |
| `auto-resume` | Reads ROADMAP.md to surface pending items during re-entry or recovery | User or host invokes resume after interruption, compaction, stale state, or an explicit recovery request |

## Matching Rule

`auto-verify` matches a roadmap phase to the active change by comparing the phase's `change:` field to `active_change` in `current.json`. If `change:` is empty or does not match, skip the roadmap update.

## Invariants

- There is exactly one roadmap file: `.agent/steering/ROADMAP.md`. Do not create parallel roadmap files.
- ROADMAP.md is a steering artifact. It is NOT a canonical pointer in `current.json`.
- ROADMAP.md is forward-looking. Work evidence lives in `.agent/work/<change>/`; the roadmap does not need to preserve completed-work history beyond `status: done` markers.
- When `auto-office-hours` produces a user-approved decomposition, it replaces existing roadmap content. A user-approved roadmap supersedes a speculative onboard roadmap.
- At most one phase has `status: active` at any time.
- A phase with `status: active` must have a non-empty `change:` field.
- Deferred scope appended by `auto-frame` starts as `status: pending` with empty `change:`.
- The `## Deferred or Not Now` section at the bottom holds items explicitly excluded from the roadmap.

## Anti-Patterns

- Creating parallel roadmap files (e.g., `ROADMAP-<name>.md`) instead of updating `ROADMAP.md`.
- Adding ROADMAP.md as a canonical pointer in `current.json`.
- Setting multiple phases to `status: active` simultaneously.
- Skipping `pending` and writing phases directly as `active` without user approval.
- Reversing status (e.g., `done` back to `active`).
- Adding fields to phase format without updating this contract.
