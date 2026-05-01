# Verification Report Template

Use this format for verification reports. Append to `VERIFY.md` or report inline.

```markdown
## Verification: [Slice Name]

**Date:** [ISO 8601 date]
**Verifier:** [agent or human]

### Criterion 1: [Acceptance Criterion]

- **Result:** PASS / FAIL / PARTIAL
- **Evidence:** [command output or direct observation]
- **Gap:** [what is missing, or "none"]

### Criterion 2: [Acceptance Criterion]

...

### Summary

- **Overall:** PASS / FAIL
- **Passed:** [N] of [M] criteria
- **Remaining gaps:** [list or "none"]
- **Recommended next skill:** [auto-execute | auto-resume | auto-plan]
```

## Rules

- Each criterion gets its own section.
- Evidence must be a direct quote from command output or a specific observation.
- "Partial" is only for criteria that have multiple sub-conditions where some pass and some fail.
- If overall is FAIL, list every gap, not just the first one found.
