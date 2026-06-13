# Verification Report Template

Plan-level format. Group results by slice; verdict applies to the entire plan. The full checklist is internal; the report expands only material gaps by default.

Two uses of one shape: the inline conversation report (always), and on PASS the same content written to `PLAN.md` as a terminal `## Verification` section (append-replace). The durable heading is exactly `## Verification`, no change-name suffix, so append-replace always has a stable target; the suffixed heading below is for the inline report only. The durable copy keeps the Summary block plus one rollup line per slice; it drops conversational framing and never stacks on a prior section.

```markdown
## Verification: [Change Name]

### Slice N: [Name]

**PASS:** [count] criteria
**Evidence:** [commands or observations that prove the pass]

**Gaps:** none, or:
- Criterion: [failed, partial, skipped, or command-derived criterion]
  Result: FAIL / PARTIAL
  Evidence: [command output or direct observation]
  Gap: [what is missing]

[Repeat only for slices with material results]

### Summary

PASS summary:
**Overall:** PASS
**Passed:** [M] of [M] criteria
**Remaining gaps:** none
**Change status:** complete
**New objective:** use `auto-office-hours` to shape the next objective when you are ready.

FAIL summary:
**Overall:** FAIL
**Passed:** [N] of [M] criteria
**Remaining gaps:** [list]
**Change status:** incomplete
**Recommended next skill:** auto-execute, or auto-plan when the same criterion failed a prior verification
```

## Rules

- Verify each criterion internally; report passing criteria as grouped counts unless there are only 1-2 criteria or the user asks for full detail.
- Evidence must be a direct quote from command output or a specific observation.
- PARTIAL means some sub-conditions pass and some fail. Still counts as FAIL for the plan.
- If overall is FAIL, list every gap across all slices, not just the first found. Expand failures, skipped checks, and derived commands.
- Write `VERIFY-GAP` annotations into PLAN.md for each failed criterion so the next skill finds them on re-entry. Check for a prior `VERIFY-GAP` on the same criterion before replacing it: a repeat escalates the handoff to auto-plan.
- If overall is PASS, do not print a `Recommended next skill` line; use the `New objective` line for future work instead.
