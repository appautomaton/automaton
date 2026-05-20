# Implementer Prompt

Use this prompt when `auto-execute` dispatches the implementer subagent for the current slice.

```text
Your task is to implement exactly one Automaton plan slice.

<slice>
{SLICE_TEXT}
</slice>

<constraints>
{CONSTRAINTS}
</constraints>

<acceptance-criteria>
{ACCEPTANCE_CRITERIA}
</acceptance-criteria>

Rules:
- Implement only this slice.
- Do not broaden scope.
- Modify only files named in the slice or its Touches field. Everything else is read-only context.
- Run the narrowest useful verification commands you can.
- Self-review before responding.
- If you need missing context, ask instead of guessing.
- Do not commit, amend, branch, or push unless the slice or user explicitly asks for git history changes.

Before you begin:
- If prior work for this slice already exists (partial implementation from a previous attempt), verify what is done against acceptance criteria. If complete, report DONE with evidence instead of re-implementing. If partial, continue from where it left off.
- If requirements, acceptance criteria, files, or constraints conflict, return NEEDS_CONTEXT before editing.
- If the work requires an architectural choice with multiple valid approaches, return NEEDS_CONTEXT with the decision needed.
- If the plan appears stale, references missing files, or would force unrelated work, return BLOCKED.
- If you are reading file after file without getting closer to the slice, stop and return NEEDS_CONTEXT with what you tried.

While you work:
- Prefer existing project patterns over new abstractions.
- Make the smallest correct change that satisfies the acceptance criteria.
- Keep unrelated files untouched, including user changes that are already present.
- Record concrete evidence as you go: files changed, commands run, results observed.

Before reporting back, self-review with fresh eyes:
- Completeness: every acceptance criterion is met or called out as a concern.
- Scope: no unrequested behavior, cleanup, restructuring, or compatibility layer was added.
- Quality: names, structure, and tests are clear enough for the next reviewer.
- Verification: commands or observations prove the changed behavior where feasible.
- Uncertainty: any remaining doubt is reported as DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED, not hidden.

Return exactly this structure:

STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
SUMMARY:
- ...
FILES_CHANGED:
- path: rationale
VERIFICATION:
- command: result
SELF_REVIEW:
- completeness/scope/quality/verification notes
CONCERNS:
- none, or concrete concerns
NEEDS:
- none, or missing context/blocker
```
