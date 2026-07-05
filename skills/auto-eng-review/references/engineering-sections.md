# Engineering Review Sections

Use this as a trigger-based risk checklist. Evaluate only sections whose trigger appears in PLAN.md, DESIGN.md, or the changed surface, and do not write "No issues found" filler: summarize clean sections in one line at most and expand only verdict-driving risks. A section earns its space by naming a failure mode before execution pays for it.

## 1. Architecture

Trigger: new pattern, cross-module integration, state machine, pipeline, external service, or unclear component boundary.

- Do component boundaries and the dependency graph stay clean, or does coupling grow?
- What breaks first under 10x load, and where is the single point of failure?
- For each new integration point, name one realistic production failure and the rollback posture (revert, flag, migration rollback, and how long it takes).
- Do auth boundaries or data access patterns move?

## 2. Errors And Rescue

Trigger: new error handling, external calls, persistence, retries, parsing, async jobs, or user-visible failure states.

For each risk-bearing codepath, name what can go wrong, whether it is rescued, and what the user sees. Catch-all handling is a smell: name specific exceptions. Every rescued error must retry with backoff, degrade gracefully, or re-raise with context, because swallow-and-continue hides the failure until it is expensive. For each gap, specify the rescue action and the user-visible result.

## 3. Security

Trigger: new user input, auth or permission boundary, secrets, file paths, network calls, dependencies, sensitive data, or injection surface.

- Where does the attack surface grow (endpoints, params, paths, jobs), and is every new input validated for nil, type, length, and injection?
- Is authorization scoped to the right user or role, with no direct object reference holes?
- Are secrets in env vars and rotatable? Do new dependencies have a security track record?
- Is PII or payment data handled consistently with existing patterns, with an audit trail for sensitive operations?

Rate each finding by likelihood and impact, with mitigation status.

## 4. Data Flow And Edge Cases

Trigger: new data transform, persistence, UI interaction, workflow state, or user-visible async behavior.

Trace each new flow from input to output and probe every stage with the boundary most likely to break it: empty, wrong type, too large, concurrent, stale, partial, or an upstream failure. For new interactions, evaluate only the applicable edge cases (double-click, navigate-away, zero results, huge results, retry-in-flight). Flag each unhandled case with its fix.

## 5. Code Quality

Trigger: the plan touches code organization, shared modules, or repeated patterns. Bound the review to files the plan touches.

Does the change fit existing patterns, name things for what they do, and avoid both over-engineering (an abstraction with no second caller) and under-engineering (happy path only)? Cite file and line for any duplication worth fixing.

## 6. Tests

Trigger: the plan adds or changes behavior. Bound the review to the new surface.

For each new flow, codepath, job, integration, and rescue path: which test type covers it, does the plan name that test, and does it cover the failure path rather than only the happy path? Name the test that catches the failure mode you fear most; a plan that lacks it has a finding. Flag tests that depend on time, randomness, external services, or ordering.

## 7. Performance

Trigger: new queries, loops over unbounded data, background jobs, large files, caching, concurrency, or external calls.

- An N+1 check on every new association traversal, and an index behind every new query.
- Maximum production size for every new data structure, and worst-case payload and retry behavior for every job.
- The top new slow path and whether anything caches it.

## 8. Observability

Trigger: operated service behavior, production workflows, async jobs, external dependencies, or hard-to-debug state.

What metric says it works, what says it is broken, and can you reconstruct what happened from logs alone? For each new failure mode, name the operational response.

## 9. Deployment

Trigger: migrations, feature flags, config changes, data compatibility, or irreversible state.

Is the migration backward-compatible and zero-downtime, what is the rollout order, and what breaks while old and new code run together? Name the explicit rollback plan and the first post-deploy check.

## 10. Trajectory

Trigger: architectural commitment, new dependency, durable schema or API, or path-dependent abstraction.

What debt does this introduce, does it make future changes harder, and how reversible is it? Would a new engineer reading this plan in a year find it obvious?

## 11. Design And UX

Trigger: UI scope.

What does the user see first, and is every interaction state covered (loading, empty, error, success, partial)? Check keyboard navigation, contrast, and touch targets, and confirm the plan matches DESIGN.md when one exists.
