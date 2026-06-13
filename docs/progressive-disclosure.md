# Progressive Disclosure Architecture

How Automaton manages progressive loading across its layers (Layer 0 through Layer 3, plus the 0.5 state probe). Each layer gates the next; nothing loads speculatively.

## Layers

```
Layer 0   Startup integration     ~100 tokens    Every session
Layer 0.5 get-context.mjs         ~50 tokens     Every skill invocation
Layer 1   SKILL.md entry point    census-capped  When skill invoked
Layer 2   references/*.md         census-capped  When trigger fires
Layer 3   Work artifacts          Variable       When stage requires
```

Layer 1 and 2 sizes are regression-guarded by `tests/context-census.test.mjs`, which pins per-file and per-stage word ceilings. That test is the source of truth for current sizes; this doc does not restate numbers that rot.

**Layer 0** -> `buildSessionContext()` reads only `current.json` for change/stage and emits a short harness reminder. It points to `current.json` and the work-artifact directory without summarizing progress prose.

**Layer 0.5** -> `.agent/.automaton/scripts/get-context.mjs` runs as each skill's first action. Self-contained (see DD-007), produces normalized JSON with diagnostics. Skills abort on error-level diagnostics before loading anything else.

**Layer 1** -> SKILL.md follows the canonical skeleton: preamble → quality gate → do (with `<GATE>` and `<STOP>` blocks at hard-stop points) → output → rules. Conditional reference reads are inlined at their procedural trigger points. Pattern: `Read references/X.md when [trigger]`.

**Layer 2** -> Per-skill references (domain-specific) and shared references (`.agent/.automaton/references`, see DD-001). Loaded only when trigger fires.

**Layer 3** -> Artifacts load in order with stop-as-soon-as-you-can:
`current.json (50 tok) → SPEC.md (1k tok) → PLAN.md (1k tok) → wiki → source files`

## Degradation Handling

Context pressure is detected behaviorally, not by percentage tiers: the model cannot reliably measure its own usage. `CONTEXT-BUDGET.md` defines the signals (silent partial completion, increasing vagueness, skipped steps, lost conclusions) and the two responses in order: conserve, then checkpoint. Host-reported usage, where a host surfaces it, is corroboration only.
