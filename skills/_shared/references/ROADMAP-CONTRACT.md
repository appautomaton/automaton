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
| `auto-onboard` | Creates ROADMAP.md with all phases set to `status: pending` and empty `change:` | First-time project setup |
| `auto-office-hours` | Writes or updates ROADMAP.md with decomposed items; sets the first spec to `status: active` with its `change:` slug | Scale is roadmap-sized and user approves an approach |
| `auto-frame` | Appends deferred scope as new `status: pending` phases | Spec is narrower than the user's stated goal |
| `auto-verify` | Sets matching phase to `status: done` | Final slice of the plan passes all criteria |
| `auto-resume` | Reads ROADMAP.md to surface pending items | Active change is complete or no active work exists |

## Matching Rule

`auto-verify` matches a roadmap phase to the active change by comparing the phase's `change:` field to `active_change` in `current.json`. If `change:` is empty or does not match, skip the roadmap update.

## Invariants

- ROADMAP.md is a steering artifact. It is NOT a canonical pointer in `current.json`.
- At most one phase has `status: active` at any time.
- A phase with `status: active` must have a non-empty `change:` field.
- Deferred scope appended by `auto-frame` starts as `status: pending` with empty `change:`.
- Existing phases from `auto-onboard` and user-requested phases from `auto-office-hours` use the same format.
- The `## Deferred or Not Now` section at the bottom holds items explicitly excluded from the roadmap.

## Anti-Patterns

- Adding ROADMAP.md as a canonical pointer in `current.json`.
- Setting multiple phases to `status: active` simultaneously.
- Skipping `pending` and writing phases directly as `active` without user approval.
- Reversing status (e.g., `done` back to `active`).
- Adding fields to phase format without updating this contract.
