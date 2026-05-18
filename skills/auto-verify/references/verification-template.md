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

**Overall:** PASS / FAIL
**Passed:** [N] of [M] criteria
**Remaining gaps:** [list or "none"]
**Recommended next skill:** [auto-resume | auto-execute]
```

## Rules

- Each criterion gets its own entry with evidence.
- Evidence must be a direct quote from command output or a specific observation.
- PARTIAL means some sub-conditions pass and some fail. Still counts as FAIL for the plan.
- If overall is FAIL, list every gap across all slices, not just the first found.
- Write `VERIFY-GAP` annotations into PLAN.md for each failed criterion so auto-execute finds them on re-entry.
