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
2. **Skill-time protocol** is host-agnostic (`SUBAGENT-PROTOCOL.md`) plus a per-host tool map (`HOST-TOOLS.md`). Both are read by **`auto-execute` only.** *(Superseded: `HOST-TOOLS.md` now also installs into `auto-office-hours`, `auto-frame`, and `auto-plan` so any stage can dispatch the read-only `automaton-librarian`. This document records the state at the time of the consolidation change.)*

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
- **C2, updated.** `lib/install.mjs` generates `HOST-TOOLS.md` only into `auto-execute/references/`. Reinstall now replaces the named Automaton skill directories from source, so stale per-skill `HOST-TOOLS.md` copies are removed without manifest bookkeeping. Behavioral coverage lives in `hosts.test.mjs`. *(Superseded later: `HOST-TOOLS.md` now installs into the four librarian-dispatching skills: office-hours, frame, plan, execute.)*
- **C4 dead files, done.** The unreferenced `examples/review-template.md` copies (both review skills) were deleted; a `skills.test.mjs` guard forbids any skill shipping an `examples/` directory.
- **C3, decided: leave inline.** The 9 `quality.md` files share a skeleton but cost ~0 runtime tokens under progressive disclosure, and their bodies are genuinely stage-specific (`skills.test.mjs` already asserts each stays distinct). Factoring the skeleton into `_shared` would trade duplication for an indirection hop that hurts readability more than the duplication hurts maintenance.
- **C4 review base, decided: leave inline.** Same reasoning; the ceo/eng review structures are parallel but per-domain tailored. No shared base.
- **C5, unchanged.** `content-*.md` remains per-stage by design.

Net: every correctness and drift-hazard concern (C1, C2, dead files) is resolved and test-guarded. The footprint-hygiene-only items (C3, review base, C5) are deliberately left inline. Suite all green at 188 tests (+6 contract/guard tests from this change).

## Follow-up audit, 2026-07-14

A second full-tree coherence audit (all skills and references, shared runtime scripts, host wiring, guard tests), run after the lightweight-steering trim rounds. Fourteen findings, none architectural. Resolution, by tier:

- **Behavior (fixed):** a standing `needs_correction` verdict survived a same-path re-plan and deadlocked execute's entry gate. `sync-status.mjs` now clears the verdict on any `--canonical-plan` sync (DD-015, `tests/lifecycle-walk.test.mjs`).
- **Guards (fixed):** the change-parking rule had one guarded entry point (office-hours) and one unguarded one (frame). It moved to a single home in `FRAMEWORK.md` (State Contract) with both entry points citing it (`tests/skill-conventions.test.mjs`). `state_drift` counted the harness's own `slice N:` rhythm commits as drift, flagging every healthy mid-execute recovery; the count now excludes them (DD-012 amendment).
- **Coherence batch (fixed):** host-neutral quality-reviewer check (`HOST-TOOLS.md` was both unreadable to the role and irrelevant to project code); FRAMEWORK's quality-card description corrected to four sections; unreachable `stage: resume` prose removed from resume surfaces (the enum value stays: it serves `automaton context resume`); the durable `## Verification` copy drops the `Change status`/`New objective` routing lines; content verification marks uncarried conditional fields n/a; an anti-slop hit defined once as a cluster; execute's preamble names the parallel-group exception to serial order; the implementer role defers to the dispatched `<edit-scope>`; lens guidance folded inline and `lens-selection.md` deleted (its trigger promised selection help it did not carry); the REPO-MAP line cap converted to a default with a named escape per the LEXICON posture.
- **Deliberately left:** the `**Next:**` bold-versus-plain variance in skill Output prose (the emission form has one home in FRAMEWORK.md, and normalizing every descriptive mention is churn without a failure mode), and everything the 2026-05-24 resolution already settled.

Verified clean in the same pass, for the next auditor's baseline: the content-mode field relay across all five stages, the subagent protocol against its role sources and dispatch prompts, roadmap-contract authorship rules across five skills, host adapters against LIBRARIAN.md's guarantees, lint vocabulary on both emit and consume ends, checkpoint and slice-default single homes, and the four-stop-edge handoff model.

Token accounting: the behavior fixes cost +91 words across surfaces that never co-load (new contracts, each carrying its why); this batch returned most of it (lens fold, pointer swaps, splice fixes), with ceilings ratcheted per the census discipline.
