# Verify Quality

Load this reference only before writing the final verification report.

**The test:** if a reader cannot reproduce the verification from the artifact, revise it.

Failures that pass the test but still sink a report:

- Completion theater: "all good" without commands, outputs, and acceptance criteria.
- Stale proof: relying on prior execution evidence instead of fresh verification.
- Hidden skipped checks: omitted commands not called out as gaps.
- Partial-pass language: softening FAIL or PARTIAL into "mostly working".

Report results like lab notes. "Appears to" and "seems to" mean the test was not run.

Before: "The authentication system appears to be working well. Tests largely pass and the overall implementation seems solid."

After: "PASS: `npm test -- auth.test.js`, 12/12 assertions. FAIL: `curl -H 'Authorization: Bearer expired' /api/me`, returns 200, expected 401."

Prose patterns: `.agent/.automaton/references/ANTI-SLOP.md`.
