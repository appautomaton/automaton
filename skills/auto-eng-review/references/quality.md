# Engineering Review Quality

Load this reference only before appending the engineering review to `PLAN.md`.

**The test:** if the implementer cannot act on a finding, rewrite it or remove it.

Failures that pass the test but still sink a review:

- Generic risk language: "may have edge cases" without naming the case.
- Polite rubber-stamp: approval that ignores a weak test strategy or an unclear data flow.
- Scope reopening: product redesign presented as engineering feedback.
- Unranked concerns: minor cleanup mixed in with blockers.

State what evidence would turn a risk into approval.

Before: "The architecture is generally sound, though error handling should be carefully considered to ensure robust coverage of edge cases."

After: "Architecture fit: 8/10. Risk: parseToken() in src/auth.js catches all exceptions and returns null, so a malformed JWT is indistinguishable from an expired one. Add typed catches for JsonWebTokenError vs TokenExpiredError."

Prose patterns: `.agent/.automaton/references/ANTI-SLOP.md`.
