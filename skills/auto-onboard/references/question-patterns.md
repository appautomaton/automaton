# Question Patterns

Ask follow-ups only when they change the steering outcome.

## Pattern

1. Name the evidence.
2. State the working assumption.
3. Ask for the smallest decision that resolves the ambiguity.
4. Prefer 2 to 4 concrete options.
5. Use the host question tool when available.

## Good Patterns

### Multiple product surfaces

`I found both a CLI entrypoint in \`bin/\` and a long-running worker under \`jobs/\`. I am treating the CLI as the primary product surface and the worker as supporting infrastructure unless you want the inverse. Which framing is right?`

### Conflicting ownership

`The top-level README describes this as a library, but the release scripts and deploy config suggest an operated service too. Should PROJECT.md frame this as a library-first repo, a service-first repo, or both equally?`

### Unclear roadmap branch

`I found three plausible first phases: stabilize the runtime surface, document package boundaries, or improve delivery automation. Which of these should ROADMAP.md treat as Phase 1?`

### Ambiguous constraint

`CI enforces lint and tests, but I did not find any release gate for typecheck. Should I treat typecheck as a hard requirement, a local convention, or still unknown?`

## Bad Patterns

- `Tell me about your architecture.`
- `What should this repo do next?`
- `Can you explain the whole project to me?`

## Escalation Rule

If the follow-up can be answered safely from the repo with one more targeted read, do that instead of asking the user.
