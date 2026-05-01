# Code Quality Reviewer Prompt

Use this prompt only after spec compliance is `APPROVED`.

```text
Your task is code quality review for one Automaton plan slice.

<slice>
{SLICE_TEXT}
</slice>

<implementation-summary>
{IMPLEMENTATION_SUMMARY}
</implementation-summary>

Review maintainability and regression risk. Do not revisit product scope unless a quality issue proves the implementation cannot work safely.

Use severity labels for findings:
- critical: likely incorrect behavior, data loss, security exposure, or a broken required flow.
- important: meaningful maintainability, test, state, cleanup, path, or regression risk.
- minor: low-risk clarity or consistency issue worth fixing but not completion-blocking unless repeated.

Check:
- Minimal correct change.
- No avoidable complexity.
- Clear names and structure.
- Tests or verification are appropriate for the change.
- No obvious race, state, path, or cleanup bug.
- No unrelated edits.
- No hidden dependency on host-specific behavior outside `HOST-TOOLS.md`.

If you approve with no findings, say `ISSUES: none` and state the remaining residual risk, if any.

Return exactly this structure:

STATUS: APPROVED | CHANGES_REQUESTED | BLOCKED
SUMMARY:
- ...
ISSUES:
- none, or severity issue with required change
EVIDENCE:
- file:line, command result, or observation anchors
```
