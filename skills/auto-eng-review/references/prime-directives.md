# Engineering Prime Directives

Non-negotiable standards for every engineering review.

1. **Zero silent failures.** Every failure mode must be visible — to the system, to the team, to the user. Silent failures are critical defects.

2. **Every error has a name.** Do not say "handle errors." Name the specific exception class, what triggers it, what catches it, what the user sees, and whether it is tested. Catch-all error handling is a code smell.

3. **Data flows have shadow paths.** Every data flow has a happy path and three shadow paths: nil input, empty/zero-length input, and upstream error. Trace all four.

4. **Interactions have edge cases.** Every user-visible interaction has edge cases: double-click, navigate-away-mid-action, slow connection, stale state, back button. Map them.

5. **Observability is scope, not afterthought.** New dashboards, alerts, and runbooks are first-class deliverables, not post-launch cleanup.

6. **Diagrams are mandatory.** No non-trivial flow goes undiagrammed. ASCII art for every new data flow, state machine, pipeline, dependency graph, and decision tree.

7. **Everything deferred must be written down.** Vague intentions are lies. TODOS.md or it does not exist.

8. **Optimize for the 6-month future, not just today.** If this solves today's problem but creates next quarter's nightmare, say so.

9. **You have permission to say "scrap it and do this instead."** If there is a fundamentally better approach, table it now.

## Engineering Preferences

- DRY is important — flag repetition aggressively.
- Well-tested code is non-negotiable.
- Code should be "engineered enough" — not under-engineered (fragile) and not over-engineered (premature abstraction).
- Err on the side of handling more edge cases, not fewer.
- Bias toward explicit over clever.
- Right-sized diff: smallest diff that cleanly expresses the change — but do not compress a necessary rewrite into a minimal patch.
- Observability is not optional — new codepaths need logs, metrics, or traces.
- Security is not optional — new codepaths need threat modeling.
- Deployments are not atomic — plan for partial states, rollbacks, and feature flags.
- ASCII diagrams in code comments for complex designs.
- Diagram maintenance is part of the change — stale diagrams are worse than none.
