# Automaton Harness: Consolidation Findings

*Recorded 2026-05-24. A register of the consistency, duplication, and contract concerns surfaced while auditing how the harness behaves once installed: orchestration wiring, shared vs. scattered artifacts, and coupling between stages. Evidence is cited as `file:line` against the `automaton/` source tree.*

## Reading guide: three cost models, not one

The instinct on seeing duplication is "deduplicate." But the harness's progressive-disclosure design makes most duplication free at runtime, so the cost model decides the priority:

- **Runtime tokens.** Only the *active* skill's references load, on demand via inline conditional triggers (`Read references/X.md when Y`). The 9 `quality.md` copies never coexist in one context window. Cross-skill duplication therefore costs ~0 runtime tokens.
- **Install footprint.** Every per-skill reference is copied into each host's skill tree (`seedTree`, `lib/install.mjs:193-229`). Duplication here is real bytes on disk and N places to drift.
- **Correctness.** A contract two skills must agree on. Drift here wastes no tokens; it silently changes behavior.

**Priority follows cost model: Correctness (C1) > Drift hazard (C2) > Footprint hygiene (C3–C5).** Deduplicating for runtime-token savings is a non-goal. The runtime levers are lean entry points and disclosure triggers, which are already in place.

## Orchestration model (context for C1–C2)

Two layers, confirmed by inspection:

1. **Install-time host mutations** wire coordination per host. Claude: `.claude/settings.json` SessionStart hook (`hosts/claude.mjs:10-48`); Codex: `.codex/config.toml` `[features] hooks=true, multi_agent=true` plus a merged `.codex/hooks.json` SessionStart hook (`hosts/codex.mjs:45-51`); OpenCode: a context-injecting plugin (`hosts/opencode.mjs`). Orchestration is **not skills-only.**
2. **Skill-time protocol** is host-agnostic (`SUBAGENT-PROTOCOL.md`) plus a per-host tool map (`HOST-TOOLS.md`). Both are read by **`auto-execute` only.**

Parallelism is deliberately confined: **`auto-plan` emits declarative labels** (`Execution:`, `Parallel-safe groups:`), **`auto-execute` enacts them**, and **`auto-frame` is unaware**. The division is sound, but it makes the plan↔execute vocabulary a load-bearing contract (C1).

## Concerns

### C1: plan->execute topology contract is string-coupled · *Correctness*

The handoff relies on `auto-plan` writing, and `auto-execute` reading, the exact tokens `Execution: subagent …` and `Parallel-safe groups:`.

- **Emitted:** `auto-plan/SKILL.md:83, 114`; worked example in `auto-plan/references/slice-examples.md:83-96`.
- **Consumed:** `auto-execute/SKILL.md:52-53` (parallel-safe), `:66-74` (route selection).
- **Risk:** no shared definition enforces the vocabulary. If either side's wording drifts, or a plan omits the topology section, `auto-execute` silently falls back to serial/direct. A capability disappears with no error and no test failure. 
- **Fix:** define the route/topology vocabulary once (alongside the stage enum in `contracts-data.json`) and add a test asserting that plan's emitted labels and execute's expected labels are the same set. **Effort: S.**

### C2: `HOST-TOOLS.md` is scattered into skills that never dispatch · *Drift hazard*

Install generates a byte-identical `HOST-TOOLS.md` into **all 9 skill dirs per host**, but only `auto-execute` reads it.

- **Generated per-skill:** `lib/install.mjs:877-884`, via `renderHostToolsReference(host)` (`lib/install.mjs:37-70`), which is keyed on host only, so all 9 copies are identical (verified: 9/9 share one md5 per host).
- **Consumed:** `auto-execute/SKILL.md:84, 206` only (verified: grep of all 9 `SKILL.md`).
- **Why it matters:** 8 of 9 copies are multi-agent instructions sitting inside non-dispatching skills (frame, plan, verify, resume, onboard, ceo-review, eng-review, office-hours). They are dead *and* off-topic, and they create 9 places to drift when the dispatch verbs change. Per host that is ~171 (Claude/OpenCode) to 180 (Codex) lines of pure redundancy.
- **Fix:** generate it once where it is read (`auto-execute/references/HOST-TOOLS.md`), or, if other skills ever need it, one copy per host skill-root rather than one per skill. **Effort: S** (localized to `lib/install.mjs:877-884`).

### C3: `quality.md` shares a skeleton across 9 skills · *Footprint hygiene*

All 9 are distinct files (9 distinct md5s) but share an identical four-section skeleton (`Anti-Patterns → Better Shape → Prose Hygiene → Final Check`) and a prose-hygiene scan backbone derived from `skills/_shared/authoring/LEXICON.md`.

- **Reality:** author-time-tailored, not copy-paste; the bodies are genuinely skill-specific (~36 lines each).
- **Fix (optional):** factor the skeleton and the shared scan list into a `_shared` reference; keep per-skill deltas inline. Trades duplication for indirection; absolute size is modest. **Effort: M, low urgency.**

### C4: review scaffolding parallels ceo/eng review · *Footprint hygiene · lower confidence*

`auto-ceo-review` and `auto-eng-review` carry parallel `review-template.md` + `quality.md` structures (distinct content, shared shape). Candidate for a shared review base if the shapes converge. **Verify before acting**, may be intentional per-domain tailoring. **Effort: M.**

### C5: `content-*.md` cross-stage track · *Footprint hygiene · lowest priority*

`content-framing / -planning / -execution / -verification / -intake` form a coherent "handle prose deliverables" concern spread across 5 skills. Genuinely per-stage; consolidation likely costs more clarity than it saves. **Note, don't act.**

## Not concerns (resolved by inspection)

- **`_shared` reference centralization** -> already correct: 4 references + 2 scripts install once into `.agent/.automaton/` (DD-001). Host-agnostic content is not duplicated.
- **"Duplication wastes runtime tokens"** -> false under progressive disclosure. See the reading guide.

## Recommended sequence

1. **C1** -> pin the topology vocabulary and add the cross-skill contract test. Highest leverage (correctness), smallest blast radius.
2. **C2** -> move `HOST-TOOLS.md` generation to `auto-execute` only. Clean install win, removes 8 dead files per host, zero runtime downside.
3. **C3** -> factor the `quality.md` skeleton opportunistically, when those files are touched anyway.
4. **C4** -> investigate, then decide.
5. **C5** -> leave as-is.

## Resolution, 2026-05-24

Executed under change `2026-05-24-unify-automaton-consistency`. Outcomes by concern:

- **C1, rescoped and closed.** This audit overstated the gap: the `Execution:` route and `Checkpoint after:` vocabularies were *already* pinned in `contracts-data.json` and enforced by `tests/execution-contract.test.mjs` on both the emit and consume sides. Only the parallel-safe topology label was unpinned. It lived in prose. Fixed by adding `topologyLabels.parallelSafeGroups` to `contracts-data.json`, exporting `TOPOLOGY_LABELS`, making `auto-plan` emit the rigid `**Parallel-safe groups:**` field, having `auto-execute` recognize it, and adding 3 assertions. The plan→execute topology contract is now fully test-enforced.
- **C2, updated.** `lib/install.mjs` generates `HOST-TOOLS.md` only into `auto-execute/references/`. Reinstall now replaces the named Automaton skill directories from source, so stale per-skill `HOST-TOOLS.md` copies are removed without manifest bookkeeping. Behavioral coverage lives in `hosts.test.mjs`.
- **C4 dead files, done.** The unreferenced `examples/review-template.md` copies (both review skills) were deleted; a `skills.test.mjs` guard forbids any skill shipping an `examples/` directory.
- **C3, decided: leave inline.** The 9 `quality.md` files share a skeleton but cost ~0 runtime tokens under progressive disclosure, and their bodies are genuinely stage-specific (`skills.test.mjs` already asserts each stays distinct). Factoring the skeleton into `_shared` would trade duplication for an indirection hop that hurts readability more than the duplication hurts maintenance.
- **C4 review base, decided: leave inline.** Same reasoning; the ceo/eng review structures are parallel but per-domain tailored. No shared base.
- **C5, unchanged.** `content-*.md` remains per-stage by design.

Net: every correctness and drift-hazard concern (C1, C2, dead files) is resolved and test-guarded. The footprint-hygiene-only items (C3, review base, C5) are deliberately left inline. Suite all green at 188 tests (+6 contract/guard tests from this change).
