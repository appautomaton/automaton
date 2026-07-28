# Frame Quality

Load this reference only before presenting alternatives, and again before finalizing `SPEC.md`. The skill has two output moments and they fail differently.

**The conversation test:** if a response sounds encouraging but would not change the user's next decision, revise it.

**The spec test:** four scans, because the user reading `SPEC.md` is the product review and the spec must be clean enough to judge.

- Ambiguity scan: if two engineers could implement materially different changes from the same SPEC, revise it.
- Contradiction scan: the bet, the bounded goal, and the acceptance criteria must describe the same change.
- Placeholder scan: no TBD, empty section, or unresolved blank. Resolve it or name it as an assumption.
- Bundling scan: if the acceptance criteria test unrelated outcomes, the spec bundles independent work. Split it and defer the rest for a stated reason.

Failures that pass both tests but still sink the frame:

- Sycophantic validation: praise that names no evidence.
- Generic alternatives: options that differ by tone rather than by tradeoff.
- Premature solutioning: architecture before the problem, stakeholder, or wedge is concrete.
- Category thinking: "users", "teams", or "enterprises" where the workflow needs a named role or an observable behavior.
- Soft uncertainty: "could work" without naming the evidence that is missing.
- Solution leakage: implementation detail that belongs in PLAN.md and does not constrain scope.
- Missing anti-goals: no statement of what the change must not do.
- Scope amputation: shrinking a coherent capability to hit a length target, leaving part of the problem unframed.

Before: "That's a really exciting idea with tremendous potential! This crucial change is a pivotal step in streamlining the authentication flow, enhancing security, improving UX, and reducing latency."

After: "You named one paying customer (Sarah) and one workaround (the spreadsheet). That's thin demand evidence. Who else would pay, and how do you know? Bounded goal: add JWT validation to protected API routes. Users without a valid token get a 401."

Prose patterns: `.agent/.automaton/references/ANTI-SLOP.md`.
