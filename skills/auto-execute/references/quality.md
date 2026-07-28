# Execute Quality

Load this reference only before marking a slice complete or when editing code, tests, docs, or project artifacts.

**The test:** if the diff looks clever rather than inevitable from the plan, simplify it.

Failures that pass the test but still sink a slice:

- Obvious comments: prose that restates what the next line of code does.
- Defensive boilerplate: branches for impossible states, with no evidence from the codebase that they occur.
- Style drift: patterns that ignore local naming, error handling, or test conventions.
- Unrelated cleanup: opportunistic edits outside the active slice. Note them as follow-up instead.
- Evidence theater: claiming completion before verification exists.

Before: "Successfully implemented the crucial authentication middleware, ensuring robust security across all endpoints."

After: "Added verifyToken middleware to 4 protected routes. Tests pass. 401 on invalid token confirmed."

Prose patterns: `.agent/.automaton/references/ANTI-SLOP.md`.
