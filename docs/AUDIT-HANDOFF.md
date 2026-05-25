# Automaton Harness — Prompt Engineering Audit (Consolidated)

*2026-05-25. Consolidates the original audit with a second-pass review that read the full L3 test suite, runtime contracts, host adapters, and install pipeline. Some findings retained verbatim, some refined, several added. Provenance noted per finding.*

---

## Reading Guide

This audit evaluates the automaton harness across two axes:

- **Vertical:** each skill as a self-contained unit (SKILL.md + references + templates).
- **Horizontal:** cross-skill consistency, shared vocabulary, handoff contracts, and enforcement mechanisms.

Findings are grouped by impact category — robustness (silent failures), token efficiency (context cost), prompt engineering quality (output sharpness), and documentation consistency (drift between contracts and contributor docs). Each finding cites the source file and section where the issue lives, plus its provenance:

- **Retained** — finding holds verbatim from the original handoff.
- **Refined** — finding is correct in spirit but the proposed fix or scope needs adjustment based on test-layer evidence.
- **New (Pass 2)** — finding identified during second-pass review of tests, contracts, and contributor docs.

---

## System Assessment

### Overall Grade: Very High

The progressive-disclosure architecture, data-driven contract enforcement, XML-tag scarcity principle, lexicon discipline, and anti-slop taxonomy demonstrate genuine craft. The consolidation findings (`docs/consolidation-findings.md`) show prior self-audit resolved the most obvious structural issues (C1 topology contract, C2 HOST-TOOLS scatter). The L3 prompt-regression test suite (`tests/skills.test.mjs`, 58KB) is unusually rigorous and catches most drift before merge. What follows are the remaining edges.

### Horizontal Consistency: Near-Perfect

Evidence from grep analysis across all 9 SKILL.md files:

- Identical skeleton: `Preamble → Quality Gate → Do → Output → Rules`.
- `get-context.mjs` invoked at line 12 in all 9 skills.
- "Does not" boundary statement test-enforced in every preamble.
- Loading discipline test-enforced in every preamble.
- Quality-gate triggers are unique and skill-specific — no copy-paste.
- `sync-status.mjs` flag patterns are consistent across all 7 state-mutating skills.
- Topology vocabulary (`EXECUTION_ROUTES`, `CHECKPOINT_TYPES`, `Parallel-safe groups:`) pinned to `contracts-data.json` and test-enforced on both emitter and consumer sides.

### What's Already L3-Enforced

The test layer prevents most prompt drift. Notable invariants test-enforced today: SKILL.md ≤ 500 lines; per-skill `quality.md` distinct content; `STATUS.md` forbidden; state writes go through `sync-status.mjs`; only the 3 allowed XML tags (`GATE`, `STOP`, `INTERVIEW`); no `<HARD-GATE>`; "does not" boundary in every preamble; lifecycle skills load `ARTIFACT-LIFECYCLE.md`; `HOST-TOOLS.md` only in auto-execute; auto-verify pass closeout terminal; auto-resume verified-complete does not auto-route; content-mode signals consistent across office-hours/frame/plan; checkpoint semantics defined once in `ARTIFACT-LIFECYCLE.md`; topology vocabulary pinned to `contracts-data.json`; `get-context` and `validateHandoff` produce identical diagnostic codes.

This means: most of what follows is what slipped past a strong test layer.

---

## Tier 1: Robustness

These close gaps where the system could silently produce incorrect state or lose work.

### R1. Inline-continuation contract is undefined across 5 edges

*Refined from original R1 — 5 edges not 4; anchor existing gate language*

**Where:** Five inline-continuation edges, each phrased differently:

| Edge | Skill:line | Phrasing | Conditions named |
|------|-----------|----------|-----------------|
| office-hours → frame | auto-office-hours:81 | "when all are true" + 4 bullets | 4 (last unmeasurable) |
| frame → plan | auto-frame:103 | "when no review is needed and context is healthy" | 2 |
| frame → office-hours (back) | auto-frame:39, 74 | "in the same session" | 0 |
| ceo-review → plan | auto-ceo-review:75 | (no qualifier) | 0 |
| execute → verify | auto-execute:129 | "when safe" | 0 |

**Problem:** Each edge resolves to nothing concrete. `CONTEXT-BUDGET.md` defines degradation tiers (PEAK/GOOD/DEGRADING/EMERGENCY) but doesn't connect them to the continuation decision. `FRAMEWORK.md` line 59 already names a 3-condition gate ("Default when the exit gate passes, reviews are non-blocking, and context is healthy") but no skill quotes it.

**Why it matters:** If the agent continues inline at DEGRADING context pressure, it loads the next skill's full SKILL.md + references into an already-stressed window. The result is silent partial completion — the most dangerous failure mode for an agentic system.

**Fix:** Anchor the existing FRAMEWORK gate as a named section, then replace each of the 5 edge phrasings with a reference:

```markdown
## Inline Continuation Gate

Before loading the next skill's contract in the same session, all four must hold:
1. The current skill's exit gate passed.
2. No blocking review verdict (`needs_clarification`, `descoped`, `needs_correction`).
3. No DEGRADING or EMERGENCY context-pressure tier.
4. No unresolved error-level diagnostic from `get-context.mjs` or `sync-status.mjs`.

If any condition fails, stop and hand off with the blocker named.
```

In each of the 5 edges, replace the bespoke phrase with: "Continue inline into `auto-X` when the Inline Continuation Gate passes."

Add an L3 test: every "continue inline" appearance in lifecycle skills must reference this anchor or be in FRAMEWORK.md itself.

**Effort:** S. One FRAMEWORK addition + 5 one-line edits + one L3 test.

---

### R2. auto-plan can overwrite in-progress execution

*Retained*

**Where:** `auto-plan/SKILL.md` GATE section.

**Problem:** The GATE blocks on missing spec and bad review verdicts, but not on "execution is already underway." If a user (or the agent after compaction) invokes `auto-plan` when `stage: execute` and PLAN.md contains slice evidence, the plan gets overwritten. `sync-status.mjs` cascade-clears `engineeringReview` when `canonicalPlan` changes, but the slice evidence (completion status, VERIFY-GAP annotations) is lost.

**Why it matters:** Slice evidence is the only record of what was done. Losing it means re-executing completed work or missing gap-fix context.

**Fix:** Add to auto-plan's GATE:

```markdown
- `stage` is `execute` or `verify` and PLAN.md contains slice evidence (status or VERIFY-GAP lines), unless the user explicitly requests re-planning or the entry is from a VERIFY-GAP correction path.
```

**Effort:** XS. One bullet in an existing GATE block.

---

### R3. Failure handling unified across both state scripts ✅ resolved differently

*Resolved by removing the Diagnostic Handling section from FRAMEWORK.md entirely. LLMs naturally report script failures without prompt-level instruction. The runtime (exit code 1, error JSON) is sufficient signal.*

**Where:** All 7 skills that invoke `sync-status.mjs`. The script exits non-zero on error and prints `"synced": false` to stdout. No SKILL.md says "if it fails, stop." FRAMEWORK.md's Diagnostic Handling block currently mentions only `get-context.mjs`.

**Problem:** If `sync-status.mjs` fails (invalid stage value, missing required field, file-system error, typo'd flag), the agent may proceed with stale or inconsistent state.

**Why it matters:** `validate.test.mjs` already proves both scripts emit identical diagnostic codes. Treating them as one rule prevents state divergence at the mutation point — cheaper than recovery.

**Fix:** Extend FRAMEWORK.md's Diagnostic Handling block:

```markdown
## Diagnostic Handling

Every skill follows the same contract:
- Error-level diagnostics from `get-context.mjs` or `sync-status.mjs` block the current
  operation. Report and stop. `sync-status.mjs` exits non-zero with `"synced": false` in
  this case.
- Warning-level diagnostics surface to the next stage or the user. They do not block.
```

Add an L3 test: every state-mutating skill is in scope of the unified rule.

**Effort:** XS. One sentence rewrite + one L3 test.

---

### R4. auto-resume STOP misses corrupted-JSON case

*Retained*

**Where:** `auto-resume/SKILL.md` STOP block.

**Problem:** The STOP fires when `current.json` is missing, but not when it exists and is malformed. The runtime emits `invalid_state_json` (error) and exits 1, but the skill's STOP block doesn't mention it, leaving the agent's mental model of "when do I halt" incomplete.

**Fix:** Add to auto-resume's STOP block:

```markdown
- `current.json` exists but `get-context.mjs` emits an `invalid_state_json` diagnostic.
```

Recovery recommendation: `auto-onboard` (rebuild state from artifacts).

**Effort:** XS. One bullet.

---

### R5. Halt-on-error contract divorced from invocation imperative ✅ resolved differently

*Resolved by removing the Diagnostic Handling section and per-skill boilerplate entirely. The premise (agents need prompt-level instruction to stop on script errors) was not validated by real usage. The runtime's exit code and error JSON are sufficient.*

**Where:** All 9 skills. `First action: run get-context.mjs` sits at line 12. The error-handling contract sits in Output at lines 75–158 (or in FRAMEWORK.md).

**Problem:** An LLM scanning top-to-bottom for "what's my first action" reads "run the script" but not the failure contract. The two are 60–200 lines apart in every skill. This is the one contract that must fire on the first token of work, placed where it's least likely to be consulted.

**Why it matters:** Highest-leverage robustness gap per character edited. Co-location turns a procedural instruction into a complete contract.

**Fix:** Apply mechanically across 9 files:

```markdown
First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root.
If any diagnostic has `level: "error"`, report the diagnostics and stop. Do not continue.
```

Add an L3 test: the First-action paragraph must include the halt instruction.

**Effort:** XS. Mechanical edit + one L3 test.

---

### R6. Work-shape silently lost when entering at auto-frame

*Refined from original Q3 — the bigger structural fix that subsumes content-mode bypass*

**Where:** `auto-frame/SKILL.md`. Three places reference work shape — Restate step (line 37 "adopt settled office-hours context"), Continue To Office-Hours fallback (line 76), and Rules ("Match SPEC shape to the work shape") — but no Classify Shape step exists.

**Problem:** `auto-office-hours` classifies work along three axes (mode/scale/shape) and writes them to `INTAKE.md`. `auto-frame` "adopts" them, but when a user enters at frame directly without an INTAKE (which the prompt explicitly allows), the agent infers "feature shape" by default. The 8 shape tracks (feature/refactor/parity/audit/migration/coverage/content/mixed) silently collapse to feature. The shape-aware fields in `spec-shape.md` (parity gap matrix, refactor invariants, migration target/rollback, audit questions, coverage targets, content audience/thesis/voice/anti-goals) never appear in the SPEC. Downstream `auto-plan` has no traceable IDs to preserve.

**Why it matters:** This is the largest silent-degradation path in the system. Content-mode bypass (the original Q3) is one symptom; parity, audit, migration, coverage, and refactor work all suffer the same fate.

**Fix:** Add a new `### Classify Shape` step to auto-frame between Restate and Coverage Check:

```markdown
### Classify Shape

If INTAKE.md exists, adopt its work shape. Otherwise, infer from the request:
- **feature** — new behavior; default
- **refactor** — internal change preserving behavior; SPEC must name invariants and blast radius
- **parity** — match a reference; SPEC must name reference and gap matrix
- **audit** — answer questions; SPEC must name questions and decision gate
- **migration** — change source→target state; SPEC must name source, target, rollback
- **coverage** — increase verification; SPEC must name risk areas and improvement target
- **content** — prose deliverable; read references/content-framing.md
- **mixed** — combine the highest-priority field from each constituent shape

Default to feature; widen only when request keywords or repo evidence point elsewhere.
```

Add an L3 test: auto-frame contains a Classify Shape step naming all 8 shape tokens.

Subsumes: original Q3 (content-mode bypass) — content is one of 8 tracks now explicitly classified.

**Effort:** S. One new step + one L3 test.

---

## Tier 2: Token Efficiency

These reduce always-loaded cost without changing behavior.

### T1. auto-execute's verify/advance loop should be a reference

*Refined from original T1 — effort M not S; line count ~32 not ~50*

**Where:** `auto-execute/SKILL.md` "Verify And Advance" + "Continuation And Handoff" sections (lines 98–130, ~32 lines).

**Problem:** Procedural detail that restates principles already in FRAMEWORK.md (handoff model) and ARTIFACT-LIFECYCLE.md (checkpoint semantics). Loads on every `auto-execute` invocation, but the detail is only needed during the verify-and-advance phase of each slice.

**Why it matters:** `auto-execute` is the most-invoked skill (called once per slice, potentially many times per change). Cumulative context cost across N slices.

**Fix:** Extract to `references/execution-loop.md`. Keep in SKILL.md only the invariant:

```markdown
### Verify And Advance

Run verification commands. Record evidence in place. Continue to the next slice unless a
checkpoint, STOP condition, or context pressure blocks continuation.

Read `references/execution-loop.md` for the full verify-advance-continue protocol.
```

**Test impact:** `tests/skills.test.mjs` pins ~12 substring assertions in the affected region. The test must be updated to read the new reference path.

**Savings:** ~25 always-loaded lines from Layer 1.
**Effort:** M (extract + test refactor; the original estimate of S underestimated test pinning).

---

### T2. auto-office-hours' coverage and alternatives protocols inline

*Retained*

**Where:** `auto-office-hours/SKILL.md` "Request Coverage" (~15 lines) and "Generate Alternatives" (~10 lines procedural).

**Problem:** These protocols fire only after the diagnostic phase is complete, but they're in the always-loaded SKILL.md. The diagnostic phase (which may take multiple turns) doesn't need them.

**Fix:** Move coverage-map classification logic to `references/coverage-protocol.md` with trigger: "Read `references/coverage-protocol.md` when the diagnostic is complete and you are ready to build the coverage map." Move alternatives-generation procedure to the existing `references/alternatives-format.md`.

**Savings:** ~40 lines from Layer 1.
**Effort:** S.

---

### T3. auto-plan's slice template should be a reference

*Refined from original T3 — effort S+M not XS*

**Where:** `auto-plan/SKILL.md` lines ~63–95 (fenced code block with all slice fields).

**Problem:** The 30-line template is needed only when writing slices for the first time. Subsequent re-plans already have the shape from existing PLAN.md. Loaded on every plan invocation regardless.

**Fix:** Move to `references/slice-template.md` with trigger: "Read `references/slice-template.md` when writing slices for the first time or when the plan shape needs correction."

**Test impact:** Both `tests/execution-contract.test.mjs` and `tests/skills.test.mjs` pin literal substrings of the slice template against `auto-plan/SKILL.md`. Both test files must update the path they read.

**Savings:** ~30 lines from Layer 1.
**Effort:** S+M (move + test refactor across two files).

---

### T4. ARTIFACT-LIFECYCLE.md split — deferred

*Refined from original T4 — defer*

**Where:** `skills/_shared/references/ARTIFACT-LIFECYCLE.md` (11.7KB).

**Original proposal:** Split into ARTIFACT-LIFECYCLE (mechanics, ~4KB) + ARTIFACT-NORMS (norms, ~7KB).

**Why deferred:**

1. **Layer-2 load only.** The doc loads on trigger, not on every skill invocation. The 11.7KB cost only hits when triggered.
2. **Sections cross-reference each other.** Handoff contract names checkpoint semantics; validation tiers reference signal discipline; review verdict routing references stage handoffs. A split forces every trigger to be more specific (or read both files).
3. **Two "audiences" converge in practice.** Writing a SPEC.md (norms-needing) requires understanding stage handoffs (mechanics-needing). Splitting penalizes the most common use.
4. **Indirection has cost.** Every "Apply ARTIFACT-LIFECYCLE.md while writing" line becomes two references.

**Recommendation:** Defer until measured token pressure proves the case. The other token-efficiency wins (T1, T2, T3) are clearer and ship first.

**Effort:** N/A (no action).

---

## Tier 3: Prompt Engineering Quality

These sharpen output without changing system behavior.

### Q1. auto-plan quality-gate trigger is meta-cognitive 🚫

*Retained*

**Where:** `auto-plan/SKILL.md` Quality Gate.

**Current:** "Read `references/quality.md` when the plan leaves execution decisions to the implementer."

**Problem:** Requires the agent to recognize that it's deferring decisions — a meta-cognitive judgment. Compare with auto-verify's trigger ("when the report sounds confident without proof") or auto-office-hours' ("when the conversation sounds encouraging but non-decisive") — observable patterns.

**Fix:** "Read `references/quality.md` when any slice lacks a verification command, when acceptance criteria use words like 'appropriate,' 'properly,' or 'as needed,' or when the plan defers a design choice to execute without naming the options."

**Effort:** XS.

---

### Q2. Review skills lack verdict calibration in preamble ✅

*Retained*

**Where:** `auto-ceo-review/SKILL.md` Preamble, `auto-eng-review/SKILL.md` Preamble.

**Problem:** These skills ask for the highest-judgment output (a verdict) with the least inline guidance. References load conditionally; the always-loaded preamble should set the bar.

**Fix:** Add to auto-ceo-review's Preamble:

```
A good review names the bet in one sentence, identifies the weakest assumption, and renders
a verdict in under 150 words. A bad review restates the spec.
```

Add to auto-eng-review's Preamble:

```
A good review names the riskiest slice, the most likely failure mode, and whether the test
strategy catches it. A bad review lists generic concerns.
```

**Effort:** XS.

---

### Q3. auto-onboard GATE is post-procedural

*Retained*

**Where:** `auto-onboard/SKILL.md` GATE block (after the full Do section).

**Problem:** GATE conditions ("no README, no package.json, no recognizable structure after 10 files") should block before scanning, but the agent reads the full scan/map/ask/write procedure before hitting the GATE. Per XML-CONVENTIONS gate taxonomy, this should be a "Pre-flight" gate.

**Fix:** Split into two gates:

1. **Pre-flight** (after Detect State, before scanning): "Do NOT proceed to scanning if the repository has no README.md, no package.json equivalent, and no recognizable directory structure after reading 10 files."
2. **Write gate** (before Write Artifacts): "Do NOT write steering artifacts if the user has not confirmed whether to overwrite existing steering."

**Effort:** XS.

---

### Q4. engineering-sections.md lacks focus-first summary

*Retained*

**Where:** `auto-eng-review/references/engineering-sections.md` (8.9KB, 11 sections).

**Problem:** Well-designed with per-section triggers, but the "evaluate only triggered sections" instruction is in the intro paragraph. When loaded into context, the agent sees 11 detailed sections and may evaluate untriggered ones out of thoroughness instinct.

**Fix:** Add a "Quick Scan" block as the first thing after the title:

```markdown
## Quick Scan

Before reading below: identify which triggers are present in PLAN.md and DESIGN.md.
Evaluate ONLY triggered sections. Skip untriggered sections entirely.
Do not write "No issues found" for skipped sections.
```

**Effort:** XS.

---

### Q5. Review handoff asymmetry is unexplained ✅

*Refined from original Q6 — extend symmetrically to auto-ceo-review*

**Where:** `auto-eng-review/SKILL.md` Output and `auto-ceo-review/SKILL.md` Output.

**Problem:** `auto-ceo-review` continues inline into `auto-plan`; `auto-eng-review` stops and recommends `auto-execute`. The asymmetry is sound (planning produces a markdown plan, not code; execution writes code, requires authorization) but unexplained at either boundary. Users see two ostensibly parallel review skills behaving differently with no rationale.

**Fix:** Explain the rationale at each boundary:

- auto-ceo-review: "continue inline into `auto-plan` (planning produces a markdown plan, not code changes; user does not need to re-authorize)"
- auto-eng-review: "stop, recommend `auto-execute` (execution writes code; the user authorizes that step)"

**Effort:** XS.

---

### Q6. description: frontmatter uses inconsistent verbs

*New (Pass 2)*

**Where:** All 9 SKILL.md frontmatters.

**Problem:** Inconsistent trigger verbs: "Use when" (5 skills), "Use before" (1), "Use as" (1), "Use after" (1), "Use on" (1). Hosts route on lexical similarity to the trigger; mixed verbs reduce auto-routing reliability across Claude / Codex / OpenCode. Not test-enforced.

**Fix:** Normalize to "Use when":

```
-description: Implement approved plan slices. Use as the execute-stage entry point.
+description: Implement approved plan slices. Use when plan is approved and code changes begin.

-description: Verify completed plan against acceptance criteria. Use after all slices are executed.
+description: Verify completed plan against acceptance criteria. Use when all plan slices report complete.

-description: Recover active change and next action from artifacts. Use on fresh session with existing work.
+description: Recover active change and next action from artifacts. Use when entering a session with existing durable state.

-description: Sharpen a vague idea into a bounded objective. Use before framing when scope is undefined.
+description: Sharpen a vague idea into a bounded objective. Use when scope is undefined and the objective is still vague.
```

Add an L3 test enforcing every `description:` contains `Use when`.

**Effort:** XS.

---

### Q7. No documented Session Entry decision tree

*New (Pass 2)*

**Where:** FRAMEWORK.md.

**Problem:** README workflow assumes a single linear path (office-hours → frame → plan → …). But the system has 4 valid entry points (`auto-onboard`, `auto-resume`, `auto-office-hours`, `auto-frame`). Users have to infer which to invoke from context. LLMs auto-routing on `description:` get partial signal but lack a decision tree.

**Fix:** Add to FRAMEWORK.md after the Stages section:

```markdown
## Session Entry

Pick the entry skill from the situation:

| Situation | Skill |
|---|---|
| Steering is missing or stale | auto-onboard |
| Active change exists in current.json | auto-resume |
| Idea is vague; objective undefined | auto-office-hours |
| Objective is bounded; framing can begin | auto-frame |
```

**Effort:** XS.

---

### Q8. Loose handoff vocabulary within auto-execute

*New (Pass 2)*

**Where:** `auto-execute/SKILL.md` line 35 ("stop and return to `auto-plan`") vs lines 64, 85 ("stop and recommend `auto-plan`").

**Problem:** Within a single skill, two phrasings for the same operation. "Return to" can be misread as "load auto-plan inline" — but the contract intent is "halt, recommend." Inconsistency reduces predictability of agent behavior under similar conditions.

**Note:** Line 127's "return to **Select Execution Window**" is an internal procedural loop, not a handoff — that usage is correct.

**Fix:** Sweep `stop and return to` → `stop and recommend` in handoff contexts across all skills. Also sweep `Return to framing` / `Return to planning` in review verdict tables. Add an L3 test forbidding "return to" followed by a skill name in non-table contexts.

**Effort:** XS. Mechanical sweep + one L3 test.

---

## Tier 4: Documentation Consistency

New tier — second pass surfaced drift between contracts, contributor docs, and L3 tests.

### N1. AGENTS.md says "Five stages" but contract has six

*New (Pass 2)*

**Where:** `AGENTS.md` line 10.

**Current:** "Five stages. `frame → plan → execute → verify → resume`."

**Problem:** `contracts-data.json` defines six stages: `["frame", "plan", "execute", "verify", "verified", "resume"]`. FRAMEWORK.md correctly says: "Five lifecycle stages: `frame → plan → execute → verify → verified`. `resume` re-enters at any point from durable state." LEXICON.md correctly lists six. AGENTS.md is the contributor entry doc and is the outlier. Not test-enforced.

**Fix:**

```markdown
- **Five lifecycle stages plus resume.** `frame → plan → execute → verify → verified`; `resume` re-enters from durable state. Prerequisites enforced in `runtime/lib/contracts-data.json`.
```

Add a test: AGENTS.md mentions every stage in the `stages` array.

**Effort:** XS.

---

### N2. bootstrap sentinel not documented in LEXICON

*New (Pass 2)*

**Where:** `LEXICON.md` "Context and State" table.

**Problem:** `installProject()` seeds `active_change: "bootstrap"`. Only `auto-frame` (line 95) explicitly handles it: "If `active_change` is `bootstrap` or does not match the current objective, derive a new slug." `auto-office-hours` handles it implicitly via "Reuse `active_change` only when it already matches this discussion." But `bootstrap` is not documented anywhere as a sentinel value.

A new contributor reading LEXICON.md cannot tell that `bootstrap` is a sentinel to be replaced rather than a real change name.

**Fix:** Add to LEXICON.md "Context and State" table:

```
| bootstrap | initial, default, blank | Sentinel value seeded by install. Frame-stage skills derive a real slug before writing artifacts; never persist as a real change name. |
```

**Effort:** XS.

---

### N3. stage: resume is in the enum but never written

*New (Pass 2)*

**Where:** `contracts-data.json` stages array, `lib/retrieval.mjs` profiles.

**Problem:** `resume` is a valid stage value, `validateState` accepts it with no diagnostics, `retrievalProfile('resume')` returns a profile. But no skill writes `--stage resume`. `auto-resume` is read-only by design. The `recovery-scenarios.md` entry "Stage resume with missing steering: recommend auto-onboard" implies the stage could exist, but no path sets it.

**Why it matters:** Low — but it's a "phantom enum value" that may confuse a contributor reading the contract. Either reserved for future use (compaction-recovery slot) or genuine dead code.

**Fix:** Document in ARTIFACT-LIFECYCLE.md stage-handoffs table that `stage: resume` is reserved for future writers (no current writer); `auto-resume` is the consumer of recovered state, not a writer of `stage: resume`.

**Effort:** XS.

---

### N4. Read-only L3 test should include auto-onboard

*New (Pass 2)*

**Where:** `tests/skills.test.mjs` read-only skills test.

**Problem:** The test currently iterates over `['auto-resume']` only. `auto-onboard` is also read-only for `current.json` (it writes steering, not state — explicit in its preamble). Drift surface: a future change to `auto-onboard` could accidentally introduce a `sync-status` call without test failure.

**Fix:**

```javascript
test('read-only skills do not include the state-write template', () => {
  for (const skillName of ['auto-resume', 'auto-onboard']) {
    ...
  }
})
```

**Effort:** XS.

---

## Tier 5: Structural Observations (No Action Needed)

These are design choices that are correct but worth documenting as intentional:

1. **Per-skill quality.md files are not deduplicated.** Correct — they share a skeleton but bodies are genuinely stage-specific. Progressive disclosure means they never coexist in one context window. Test-enforced as distinct.
2. **content-*.md references are per-stage.** Correct — content-framing, content-planning, content-execution, content-verification each carry stage-specific constraints. Consolidation would lose stage-appropriate focus. Test-enforced as non-duplicating.
3. **The cognitive-patterns reference (2.9KB, 18 patterns) is large for a single load.** Acceptable — it loads only when auto-ceo-review fires, and the application map at the bottom helps the agent focus.
4. **auto-resume and auto-onboard have overlapping detection logic.** Correct by design — they serve different purposes (recover state vs. build steering); the runtime's `get-context.mjs` diagnostics already disambiguate.
5. **The `landscape-awareness.md` privacy gate creates a conversational fork.** Acceptable — the reference handles the skip case and the SKILL.md flow proceeds to alternatives regardless.
6. **"Execution window" abstraction in auto-execute.** Heavily test-pinned (~20 substring assertions). The abstraction carries a real distinction (the batch the executor commits to before pausing). Removing it for marginal token savings is high-cost. Keep as is.

---

## Priority Sequence

Sorted by impact ÷ effort, ready for execution.

### Group A — Robustness (ship together; one PR closes silent-failure paths)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | R1 — Anchor Inline Continuation Gate in FRAMEWORK + replace 5 edge phrasings | S | Closes vaguest cross-skill contract; all 5 inline edges resolve to one rule |
| 2 | ~~R5 — Co-locate halt-on-error with First action across 9 skills~~ | ✅ | Resolved: removed babysitting language entirely |
| 3 | ~~R3 — Unified diagnostic-handling clause covering both scripts~~ | ✅ | Resolved: removed babysitting language entirely |
| 4 | R6 — Classify Shape step in auto-frame (subsumes original Q3) | S | Closes 6+ silent shape-degradation paths |
| 5 | R2 — Extend auto-plan GATE for stage:execute + slice evidence | XS | Prevents accidental plan/evidence destruction |
| 6 | R4 — auto-resume STOP for invalid_state_json | XS | Documents existing runtime behavior |

### Group B — Documentation Consistency (ship together)

| # | Item | Effort |
|---|------|--------|
| 7 | N1 — Fix AGENTS.md "five stages" inconsistency | XS |
| 8 | N4 — Extend read-only L3 test to auto-onboard | XS |
| 9 | N2 — Add bootstrap sentinel to LEXICON | XS |
| 10 | N3 — Document stage:resume as reserved | XS |

### Group C — Prompt Engineering Quality (opportunistic)

| # | Item | Effort |
|---|------|--------|
| 11 | ~~Q1 — Make auto-plan quality trigger observable~~ | 🚫 |
| 12 | ~~Q2 — Verdict calibration in review preambles~~ | ✅ |
| 13 | Q3 — auto-onboard pre-flight GATE | XS |
| 14 | Q4 — Quick Scan in engineering-sections.md | XS |
| 15 | ~~Q5 — Symmetric handoff explanations on both review skills~~ | ✅ |
| 16 | Q6 — Normalize description: verbs to "Use when" | XS |
| 17 | Q7 — Session Entry table in FRAMEWORK.md | XS |
| 18 | Q8 — Sweep "return to" → "stop and recommend" in handoff contexts | XS |

### Group D — Token Efficiency (tackle when stable; effort revised upward)

| # | Item | Effort |
|---|------|--------|
| 19 | T1 — Extract auto-execute verify-loop | M |
| 20 | T2 — Extract auto-office-hours coverage/alternatives | S |
| 21 | T3 — Move auto-plan slice template | S+M |

### Deferred / Withdrawn

- **T4** — Split ARTIFACT-LIFECYCLE.md. Deferred. Doc is genuinely cohesive; sections cross-reference each other; Layer-2 (loaded on trigger only). Reconsider only if measured token pressure proves the case.

**Recommended execution order:** Group A first (robustness, shippable as one PR), Group B second (docs hygiene, also shippable as one), Group C opportunistically (each is XS), Group D when ready to absorb the test-refactor cost.

---

## What Not To Change

These are deliberate and load-bearing. Resist optimization passes that would unify them:

- The 3-tag XML system (`<GATE>`, `<STOP>`, `<INTERVIEW>`). Works because of scarcity.
- The progressive-disclosure trigger pattern (`Read references/X.md when Y`). Core token-efficiency mechanism.
- The lexicon and prohibited phrases. Already tight.
- The three-tier validation split (L1 runtime / L2 consuming skill / L3 prompts+tests). The only way the runtime stays portable across 3 hosts.
- The `sync-status.mjs` cascade logic. The only thing preventing zombie state.
- The per-skill `quality.md` files. Genuinely stage-specific; test-enforced as distinct.
- The content-mode per-stage track. Per-stage by design; test-enforced.
- The subagent protocol and reviewer prompts. Clean and effective.
- The `<automaton_reminder>` from a single `buildSessionContext()`. The 3-host adapter convergence point.
- Topology vocabulary pinning in `contracts-data.json`. Closes the entire class of "rename-on-one-side breaks the other silently" failures.

---

## Provenance Summary

| Source | Count | Items |
|--------|-------|-------|
| Retained from original | 6 | R2, R4, T2, Q1, Q2, Q3, Q4 |
| Refined from original | 5 | R1, R3, R6 (was Q3 with bigger scope), Q5 (was Q6 extended), T1 + T3 (effort revised) |
| Contested from original | 1 | T4 (defer) |
| New (Pass 2) | 8 | R5 (halt-on-error), Q6 (description verbs), Q7 (session entry), Q8 (handoff vocab), N1 (AGENTS stages), N2 (bootstrap), N3 (stage resume), N4 (auto-onboard test) |

Net: 14 original findings → 12 carried forward (6 unchanged, 5 refined, 1 deferred) + 8 new = 20 actionable items.
