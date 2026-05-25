# Progressive Disclosure Architecture

How Automaton manages progressive loading across four layers. Each layer gates the next; nothing loads speculatively.

## Layers

```
Layer 0   Startup integration     ~100 tokens    Every session
Layer 0.5 get-context.mjs         ~50 tokens     Every skill invocation
Layer 1   SKILL.md entry point    105-234 lines  When skill invoked
Layer 2   references/*.md         21-180 lines   When trigger fires
Layer 3   Work artifacts          Variable       When stage requires
```

**Layer 0** — `buildSessionContext()` reads only `current.json` for change/stage and emits a short harness reminder. It points to `current.json` and the work-artifact directory without summarizing progress prose.

**Layer 0.5** — `.agent/.automaton/scripts/get-context.mjs` runs as each skill's first action. Self-contained (see DD-007), produces normalized JSON with diagnostics. Skills abort on error-level diagnostics before loading anything else.

**Layer 1** — SKILL.md follows: preamble → quality gate → procedure → hard gates → stop conditions → `## Deep` with conditional references. Key pattern: `Read X (~N lines) when [trigger]` — size hint lets the model estimate cost.

**Layer 2** — Per-skill references (domain-specific) and shared references (`.agent/.automaton/references`, see DD-001). Loaded only when trigger fires.

**Layer 3** — Artifacts load in order with stop-as-soon-as-you-can:
`current.json (50 tok) → SPEC.md (1k tok) → PLAN.md (1k tok) → wiki → source files`

## Degradation Tiers

| Tier | Usage | Rule |
|------|-------|------|
| PEAK | 0-30% | Full operations |
| GOOD | 30-50% | Frontmatter reads, delegate aggressively |
| DEGRADING | 50-70% | Minimal inlining, warn user |
| EMERGENCY | 70%+ | Halt, checkpoint immediately |
