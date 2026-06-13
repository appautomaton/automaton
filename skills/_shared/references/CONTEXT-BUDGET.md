# Context Loading Discipline

Internal guidelines for preserving reasoning headroom across multi-session agentic work.

## Principles

1. **Context is finite.** Every token loaded reduces headroom for reasoning. Treat context like memory, not storage.
2. **Load progressively.** Start with the smallest artifact that unlocks the next decision. Load more only when needed.
3. **Recall over re-read.** Do not re-read a file you can still accurately recall. Re-read when the file changed, when a verification pass requires fresh evidence, or when your recall is uncertain.
4. **Generate summaries, not transcripts.** When reporting findings, compress 500 lines of evidence into 5 lines of conclusion.
5. **Keep artifacts concrete.** Do not write context-budget fields, token-allocation notes, or percentage estimates into SPEC.md, PLAN.md, slice detail files, or evidence blocks. Artifacts record objectives, acceptance criteria, verification, dependencies, status, evidence, risks, and links.

## Progressive Loading Order

When entering any stage, load files in this order. Stop as soon as you have enough context to proceed.

```
1. .agent/.automaton/state/current.json   (always, tiny)
2. SPEC.md      (if canonical_spec exists)
3. PLAN.md      (if executing)
4. Wiki pages   (LEARNINGS.md when present, others only when referenced by spec or plan)
5. Source files (read as needed to understand the project and produce accurate work)
```

## Degradation Signals

You cannot reliably measure your own context usage. Watch behavior, not percentages:

- **Silent partial completion.** Work is claimed done but the implementation is incomplete.
- **Increasing vagueness.** "Appropriate handling" or "standard patterns" replace specific code and paths.
- **Skipped steps.** Protocol steps that would normally run are omitted.
- **Lost conclusions.** Re-deriving or contradicting something settled earlier in the session.

When the host surfaces actual context usage, treat it as corroboration: above roughly half, conserve. Near exhaustion, checkpoint. Do not guess percentages the host does not report.

## Conserve Then Checkpoint

Two responses, in order:

1. **Conserve.** Stop new wide reads. Dispatch the librarian for lookups instead of reading inline. Summarize aggressively. Finish the current slice before starting anything new.
2. **Checkpoint.** When signals persist after conserving, record slice evidence and durable state, then stop with a clear next action. A clean checkpoint beats a degraded continuation.

## Re-Read Rule

Default: a file read this session stays usable from memory. Re-read it when any of these hold:

- The user asks you to.
- You wrote to it and need to verify the write.
- It is known to have changed.
- The current skill is an explicit verification pass and fresh evidence is part of the acceptance criteria.
- The session was compacted, or you are no longer sure what it said.

**If you cannot remember what a file said, re-read the specific section.** Answering from a confident guess is worse than the second read.

## Artifact Language Boundary

Use this guide to decide what to load, link, summarize, or checkpoint. Do not turn the heuristic into durable artifact prose.

| Instead of... | Use... |
|---------------|--------|
| Context-size estimates in PLAN.md | `Detail: slices/slice-NNN.md` when slice instructions are too large for the plan index |
| "This is a big change" | "This requires three independently verifiable slices" |
| "Read the whole codebase" | "Load files named by the active slice and scan wider only when correctness requires it" |
| "Re-read the spec" | "Summarize the relevant section from memory unless a re-read trigger applies" |

## Anti-Patterns

- **Broad scans.** `find . -name "*.js" | xargs cat` loads the entire codebase. Never do this.
- **Greedy wiki loading.** Loading every file in `.agent/wiki/` because "they might be useful."
- **Artifact bloat.** A SPEC.md that is 800 lines long. Link detail under `spec/*.md` or move architecture rationale to DESIGN.md.
- **Re-read loops.** Reading `package.json` three times in one session because it was not held in working memory.
- **Confident amnesia.** Refusing to re-read after compaction and summarizing a file from a guess instead.
