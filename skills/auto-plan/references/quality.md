# Plan Quality

Load this reference only before finalizing or refreshing `PLAN.md`.

**The test:** if the implementer must decide what "done" means, revise the slice.

Failures that pass the test but still sink a plan:

- Architecture theater: new structure introduced to make the plan look sophisticated.
- Hidden dependencies: a slice needs context, files, or decisions the plan never names.
- Overloaded slices: one slice touching unrelated systems, or too much to verify independently.

Before: "This slice explores implementing a robust, comprehensive caching layer — ensuring consistency, enabling scalability, and enhancing performance."

After: "Add a Redis read-through cache to the /users endpoint. Cache invalidates on write. TTL 5 minutes."

Prose patterns: `.agent/.automaton/references/ANTI-SLOP.md`.
