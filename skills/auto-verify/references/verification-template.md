# Verification Report Template

Plan-level format. Group results by slice; verdict applies to the entire plan.

```markdown
## Verification: [Change Name]

### Slice N: [Name]

**Criterion:** [acceptance criterion from plan]
**Result:** PASS / FAIL / PARTIAL
**Evidence:** [command output or direct observation]
**Gap:** [what is missing, or "none"]

[Repeat for each criterion in this slice]

[Repeat for each slice in the plan]

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
**Recommended next skill:** auto-execute
```

## Rules

- Each criterion gets its own entry with evidence.
- Evidence must be a direct quote from command output or a specific observation.
- PARTIAL means some sub-conditions pass and some fail. Still counts as FAIL for the plan.
- If overall is FAIL, list every gap across all slices, not just the first found.
- Write `VERIFY-GAP` annotations into PLAN.md for each failed criterion so auto-execute finds them on re-entry.
- If overall is PASS, do not print a `Recommended next skill` line; use the `New objective` line for future work instead.
