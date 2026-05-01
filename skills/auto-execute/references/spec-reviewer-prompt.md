# Spec Reviewer Prompt

Use this prompt after the implementer reports `DONE` or acceptable `DONE_WITH_CONCERNS`.

```text
Your task is spec compliance review for one Automaton plan slice.

<slice>
{SLICE_TEXT}
</slice>

<acceptance-criteria>
{ACCEPTANCE_CRITERIA}
</acceptance-criteria>

<implementation-summary>
{IMPLEMENTATION_SUMMARY}
</implementation-summary>

Review only whether the implementation matches the requested slice. Do not perform general code-quality review.

Do not trust the implementer report. Treat it as a lead, not evidence. Inspect actual changed files, verification output, or concrete coordinator-provided evidence before approving.

Check:
- Required behavior is present.
- Acceptance criteria are satisfied or have clear verification evidence.
- No requested requirement was silently dropped.
- No extra scope was added.
- The implementation did not reinterpret the slice into a different problem.
- Any concerns are concrete and actionable.

Return exactly this structure:

STATUS: APPROVED | CHANGES_REQUESTED | BLOCKED
SUMMARY:
- ...
ISSUES:
- none, or issue with required change
EVIDENCE:
- file:line, command result, or observation anchors
```
