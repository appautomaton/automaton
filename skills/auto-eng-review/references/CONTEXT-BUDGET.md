# Context Budget

Guidelines for managing context windows across multi-session agentic work.

## Principles

1. **Context is finite.** Every token loaded reduces headroom for reasoning. Treat context like memory, not storage.
2. **Load progressively.** Start with the smallest artifact that unlocks the next decision. Load more only when needed.
3. **Never re-read.** If you loaded a file in this session, do not read it again unless the user explicitly requests it, you know it has changed, or you are running a verification step that requires fresh evidence.
4. **Generate summaries, not transcripts.** When reporting findings, compress 500 lines of evidence into 5 lines of conclusion.

## Progressive Loading Order

When entering any stage, load files in this order. Stop as soon as you have enough context to proceed.

```
1. .agent/.automaton/state/current.json (always — < 50 tokens)
2. STATUS.md             (always — < 200 tokens)
3. SPEC.md               (if canonical_spec exists — < 1000 tokens)
4. PLAN.md               (if executing — < 1000 tokens)
5. Wiki pages            (only if referenced by spec or plan)
6. Source files          (only the files the current slice touches)
```

## Context Budget Language

Frame all work in terms of context consumption, not time.

| Instead of... | Use... |
|---------------|--------|
| "This will take 2 hours" | "This slice consumes ~5% of the available context" |
| "This is a big change" | "This change requires 3 slices, each ~10% of context" |
| "Read the whole codebase" | "Scan 10 files to build a repo map (~8% of context)" |
| "Re-read the spec" | "The spec is already loaded. Summarize the relevant section unless this is a verification step." |

## Session Budgets

Typical context window sizes and safe budgets:

| Model | Total Window | Safe Working Budget | Notes |
|-------|-------------|---------------------|-------|
| Claude 3.5/3.7 Sonnet | 200K tokens | 120K tokens (60%) | Reserve 40% for response generation |
| Claude 3 Opus | 200K tokens | 120K tokens (60%) | Same as Sonnet |
| GPT-4o | 128K tokens | 80K tokens (62%) | Slightly more aggressive load safe |
| Codex CLI | 200K tokens | 120K tokens (60%) | Assume Claude-class unless known |

**Rule of thumb:** Keep loaded context under 60% of total window. The remaining 40% is for the model's reasoning and response.

## Context Degradation Tiers

Monitor context usage and adjust behavior accordingly. These are behavioral rules, not hard limits.

| Tier | Usage | Behavior |
|------|-------|----------|
| **PEAK** | 0–30% | Full operations. Read bodies, spawn multiple agents, inline results. |
| **GOOD** | 30–50% | Normal operations. Prefer frontmatter reads, delegate aggressively. |
| **DEGRADING** | 50–70% | Economize. Frontmatter-only reads, minimal inlining, warn user about budget. |
| **EMERGENCY** | 70%+ | Halt new work. Checkpoint progress immediately. No new reads unless critical. |

**Warning signs before panic thresholds fire:**

- **Silent partial completion** — agent claims task is done but implementation is incomplete.
- **Increasing vagueness** — phrases like "appropriate handling" or "standard patterns" replace specific code.
- **Skipped steps** — agent omits protocol steps it would normally follow.

When you see these, assume context pressure and move to a higher tier of conservation.

## Anti-Patterns

- **Broad scans.** `find . -name "*.js" | xargs cat` loads the entire codebase. Never do this.
- **Greedy wiki loading.** Loading every file in `.agent/wiki/` because "they might be useful."
- **Artifact bloat.** SPEC.md that is 800 lines long. Split the change or move detail to DESIGN.md.
- **Re-read loops.** Reading `package.json` three times in one session because it was not held in working memory.

## Compression Techniques

When context is tight, use these techniques in order:

1. **Summarize before loading.** If a wiki page is > 200 lines, read its headers first, then only the relevant section.
2. **Table over prose.** A 5-row table compresses better than 5 paragraphs describing the same relationships.
3. **Pointer over payload.** Reference a file by path rather than quoting its contents unless the exact text is needed.
4. **Tag over sentence.** `<STOP>` followed by `Missing dependency: <name>` is more parseable than "I cannot proceed because the dependency is missing."

## No-Re-Read Rule

**Absolute rule:** Once a file is read in a session, it stays loaded. Do not read it again.

**Exceptions:**
- The user explicitly asks you to re-read it.
- You wrote to the file and need to verify the write.
- The file is known to have changed (e.g., you ran a command that mutates it).
- The current skill is an explicit verification pass, such as `auto-verify`, and fresh evidence is part of the acceptance criteria.

**If you cannot remember what a file said:** Summarize from your existing context rather than re-reading.
