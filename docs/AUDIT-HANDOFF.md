# Automaton Harness — Prompt Engineering Audit (Post Re-evaluation)

*2026-05-26. After deep code-grounded review of all 20 originally-actionable items, the actionable list collapsed to 5 items. The other 15 were either resolved by removing prompt-level babysitting (R3, R5), shipped (Q2, Q5), or rejected on closer inspection. Each rejection has a one-line rationale.*

---

## Reading Guide

This audit evaluated the automaton harness across two axes:

- **Vertical:** each skill as a self-contained unit (SKILL.md + references + templates).
- **Horizontal:** cross-skill consistency, shared vocabulary, handoff contracts, and enforcement mechanisms.

Findings now carry a status:

- **✅ Done** — shipped in this audit cycle.
- **✅ Resolved differently** — the underlying concern was addressed by a different approach (usually by removing prompt-level babysitting rather than adding more of it).
- **🚫 Rejected** — on closer inspection, the proposed fix was wrong or marginal. Rationale included.
- **Open** — survived re-evaluation. Worth doing.

---

## System Assessment

### Overall Grade: Very High

The progressive-disclosure architecture, data-driven contract enforcement, XML-tag scarcity principle, lexicon discipline, and anti-slop taxonomy demonstrate genuine craft. The L3 prompt-regression test suite (`tests/skills.test.mjs`, 58KB) is unusually rigorous and catches most drift before merge. **The deeper finding from re-evaluation: the framework is more mature than the original audit credited.** Most "issues" were either babysitting, premature optimization, redundant with existing instructions, or cosmetic.

### What's Already L3-Enforced

The test layer prevents most prompt drift. Notable invariants test-enforced today: SKILL.md ≤ 500 lines; per-skill `quality.md` distinct content; `STATUS.md` forbidden; state writes go through `sync-status.mjs`; only the 3 allowed XML tags (`GATE`, `STOP`, `INTERVIEW`); no `<HARD-GATE>`; "does not" boundary in every preamble; lifecycle skills load `ARTIFACT-LIFECYCLE.md`; `HOST-TOOLS.md` only in auto-execute; auto-verify pass closeout terminal; auto-resume verified-complete does not auto-route; content-mode signals consistent across office-hours/frame/plan; checkpoint semantics defined once in `ARTIFACT-LIFECYCLE.md`; topology vocabulary pinned to `contracts-data.json`; `get-context` and `validateHandoff` produce identical diagnostic codes.

---

## Open Items (5)

The actionable list, in priority order.

### R2. auto-plan can overwrite in-progress execution

**Where:** `auto-plan/SKILL.md` GATE section.

**Problem:** The GATE blocks on missing spec and bad review verdicts, but not on "execution is already underway." If a user (or the agent after compaction) invokes `auto-plan` when `stage: execute` and PLAN.md contains slice evidence, the plan gets overwritten. `sync-status.mjs` cascade-clears `engineeringReview` when `canonicalPlan` changes — but it only touches `current.json`, never PLAN.md content. The slice evidence (status blocks, VERIFY-GAP annotations) is lost when the agent rewrites PLAN.md.

**Why it survives re-evaluation:** Verified by reading `sync-status.mjs` (the cascade only mutates `current.json`) and `auto-plan/SKILL.md` (no protection for existing PLAN.md slice evidence). Real data-loss path with cheap fix.

**Fix:** Add to auto-plan's GATE:

```markdown
- `stage` is `execute` or `verify` and PLAN.md contains slice evidence (status or VERIFY-GAP lines), unless the user explicitly requests re-planning or the entry is from a VERIFY-GAP correction path.
```

**Effort:** XS. One bullet in an existing GATE block.

---

### Q7. No documented Session Entry decision tree

**Where:** FRAMEWORK.md.

**Problem:** README workflow assumes a single linear path (office-hours → frame → plan → …). But the system has 4 valid entry points (`auto-onboard`, `auto-resume`, `auto-office-hours`, `auto-frame`). Users have to infer which to invoke from context. LLMs auto-routing on `description:` get partial signal but lack a decision tree.

**Why it survives re-evaluation:** Real UX gap. 5 lines added to a Layer-2 reference loaded once per session. Helps both humans and LLM auto-routing.

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

### N1. AGENTS.md says "Five stages" but contract has six

**Where:** `AGENTS.md` line 10.

**Current:** "Five stages. `frame → plan → execute → verify → resume`."

**Problem:** `contracts-data.json` defines six stages: `["frame", "plan", "execute", "verify", "verified", "resume"]`. FRAMEWORK.md correctly says "Five lifecycle stages: `frame → plan → execute → verify → verified`. `resume` re-enters at any point from durable state." LEXICON.md correctly lists six. AGENTS.md is the contributor entry doc and is the outlier — it omits `verified`.

**Why it survives re-evaluation:** Verified factual error in contributor doc.

**Fix:**

```markdown
- **Five lifecycle stages plus resume.** `frame → plan → execute → verify → verified`; `resume` re-enters from durable state. Prerequisites enforced in `runtime/lib/contracts-data.json`.
```

**Effort:** XS.

---

### N2. bootstrap sentinel not documented in LEXICON

**Where:** `LEXICON.md` "Context and State" table.

**Problem:** `installProject()` in `lib/install.mjs:363` seeds `active_change: "bootstrap"`. Only `auto-frame` explicitly handles it ("If `active_change` is `bootstrap` or does not match the current objective, derive a new slug"). But `bootstrap` is not documented anywhere as a sentinel value. A new contributor reading LEXICON.md cannot tell that `bootstrap` is a sentinel to be replaced rather than a real change name.

**Why it survives re-evaluation:** Verified — install seeds it, LEXICON has zero entries for it. Genuine documentation gap for contributors.

**Fix:** Add to LEXICON.md "Context and State" table:

```
| bootstrap | initial, default, blank | Sentinel value seeded by install. Frame-stage skills derive a real slug before writing artifacts; never persist as a real change name. |
```

**Effort:** XS.

---

### N4. Read-only L3 test should include auto-onboard

**Where:** `tests/skills.test.mjs` read-only skills test.

**Problem:** The test currently iterates over `['auto-resume']` only. `auto-onboard` is also read-only for `current.json` (its preamble explicitly says "current.json is initialized by install/scaffold when missing; auto-onboard writes steering truth, not active-change state"). Drift surface: a future change to `auto-onboard` could accidentally introduce a `sync-status` call without test failure.

**Why it survives re-evaluation:** Verified — auto-onboard has zero `sync-status` calls. One-line fix prevents real future drift.

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

## Already Done (4)

### Q2. Verdict calibration in review preambles ✅

Shipped: added good-vs-bad contrast paragraphs to auto-ceo-review and auto-eng-review preambles. Each review skill now sets the bar before the agent renders a verdict.

### Q5. Review handoff asymmetry is unexplained ✅

Shipped: added symmetric rationale parentheticals — auto-ceo-review explains why it continues inline (markdown-to-markdown, no re-authorization needed); auto-eng-review explains why it stops (execution writes code, requires authorization).

### R3. Failure handling unified across both state scripts ✅ resolved differently

Resolved by **removing** the Diagnostic Handling section from FRAMEWORK.md entirely rather than extending it. LLMs naturally report script failures and stop without prompt-level instruction. The runtime (exit code 1, error JSON) is sufficient signal.

### R5. Halt-on-error contract divorced from invocation imperative ✅ resolved differently

Resolved by **removing** the per-skill diagnostic boilerplate ("Error-level diagnostics block this skill...") rather than co-locating it. The premise (agents need prompt-level instruction to stop on script errors) was not validated by real usage.

---

## Rejected on Re-evaluation (11)

After grounding each finding in the actual code, the following items were rejected. One-line rationale per item.

### Tier 1: Robustness (3 rejected)

**🚫 R1. Inline-continuation contract is undefined across 5 edges.**
The 5 edges have **context-specific** conditions that make sense locally. Office-hours→frame has 4 substantive frame-readiness checks. Frame→office-hours back is a how-to-invoke note, not a gate. The proposed unified gate adds an unmeasurable condition (context-pressure tier the agent cannot self-check) — same babysitting pattern we rejected for R3/R5.

**🚫 R4. auto-resume STOP misses corrupted-JSON case.**
Same threshold as R3/R5: agents naturally stop on script errors with error-level diagnostics. The marginal benefit (preventing manual JSON repair) is small. The existing "Do not attempt recovery without a state file" line already directs to auto-onboard.

**🚫 R6. Work-shape silently lost when entering at auto-frame.**
`spec-shape.md` already lists all 8 shape variants. Select Lenses already has explicit content-mode trigger. For clear keywords (refactor/audit/parity/migrate) the agent classifies correctly. For ambiguous cases, Interview asks. The proposed 12-line Classify Shape step is mostly redundant.

### Tier 2: Token Efficiency (3 rejected)

**🚫 T1. auto-execute's verify/advance loop should be a reference.**
The audit's "cumulative cost" framing was wrong — skills load once per session per the no-re-read rule, not per slice. Extracting to `execution-loop.md` saves nothing because the trigger almost always fires. Real test-refactor cost (~12 substring assertions). User has used framework for months without context-pressure complaints.

**🚫 T2. auto-office-hours' coverage and alternatives protocols inline.**
Same reasoning as T1 — the protocols almost always fire in office-hours sessions. Extraction is net-zero token shifting with real test-refactor cost.

**🚫 T3. auto-plan's slice template should be a reference.**
Only saves on rare re-plans (most invocations are first plans). Test-pinning across two test files makes this S+M effort for marginal gain.

### Tier 3: Prompt Engineering Quality (4 rejected)

**🚫 Q1. auto-plan quality-gate trigger is meta-cognitive.**
The current trigger ("when the plan leaves execution decisions to the implementer") is clear enough. The proposed replacement listing trigger words ('appropriate', 'properly', 'as needed') is brittle keyword-scanning that misses other vague patterns.

**🚫 Q3. auto-onboard GATE is post-procedural.**
The proposed fix splits one GATE into two — **violating XML-CONVENTIONS** rule "One `<GATE>` per skill. More than one dilutes the signal." The audit didn't catch its own self-conflict. The current placement is correct: both conditions are inherently post-scan checks.

**🚫 Q4. engineering-sections.md lacks focus-first summary.**
The intro paragraph already says "Evaluate only sections whose trigger appears in PLAN.md, DESIGN.md..." and "Summarize clean sections in one line at most." The eng-review SKILL.md also says "summarize only verdict-driving dimensions." Adding a third instance of the same instruction is redundant.

**🚫 Q6. description: frontmatter uses inconsistent verbs.**
The routing claim is **unsubstantiated** — Claude Code, Codex, and OpenCode use full descriptions for skill matching, not verb-pattern lexical similarity. The proposed rephrasings ("Use when all plan slices report complete" vs "Use after all slices are executed") are *less* natural than the originals. Bad trade.

**🚫 Q8. Loose handoff vocabulary within auto-execute.**
The "return to" usage is contextually clear: parenthetical inside a GATE bullet, or in a "Meaning" column with a separate "Next Action" column that names the skill. Sweeping for cosmetic uniformity has no behavior benefit.

### Tier 4: Documentation Consistency (1 rejected)

**🚫 N3. stage:resume is in the enum but never written.**
Phantom enum value, but the puzzle resolves quickly when a contributor reads existing docs. Low-value documentation note.

---

## Tier 5: Structural Observations (No Action — Confirmed)

These are design choices that survived both audits as correct:

1. **Per-skill quality.md files are not deduplicated.** Stage-specific bodies. Test-enforced as distinct.
2. **content-*.md references are per-stage.** Each carries stage-specific constraints.
3. **The cognitive-patterns reference (2.9KB, 18 patterns) is large for a single load.** Loads only when auto-ceo-review fires.
4. **auto-resume and auto-onboard have overlapping detection logic.** Different purposes; runtime diagnostics disambiguate.
5. **The `landscape-awareness.md` privacy gate creates a conversational fork.** Reference handles skip case.
6. **"Execution window" abstraction in auto-execute.** Heavily test-pinned; carries a real distinction.

---

## What Not To Change

These are deliberate and load-bearing. Resist optimization passes that would unify them:

- The **3-tag XML system** (`<GATE>`, `<STOP>`, `<INTERVIEW>`). Works because of scarcity.
- The progressive-disclosure trigger pattern (`Read references/X.md when Y`). Core token-efficiency mechanism.
- The lexicon and prohibited phrases. Already tight.
- The three-tier validation split (L1 runtime / L2 consuming skill / L3 prompts+tests).
- The `sync-status.mjs` cascade logic. The only thing preventing zombie state.
- The per-skill `quality.md` files. Stage-specific despite shared skeleton.
- The content-mode per-stage track. Per-stage by design.
- The subagent protocol and reviewer prompts. Clean and effective.
- The `<automaton_reminder>` from a single `buildSessionContext()`. The 3-host adapter convergence point.
- Topology vocabulary pinning in `contracts-data.json`.

---

## Re-evaluation Summary

| Outcome | Count | Items |
|---------|-------|-------|
| ✅ Done (shipped) | 2 | Q2, Q5 |
| ✅ Resolved differently (removed babysitting) | 2 | R3, R5 |
| Open (worth doing) | 5 | R2, Q7, N1, N2, N4 |
| 🚫 Rejected on re-evaluation | 11 | R1, R4, R6, T1, T2, T3, Q1, Q3, Q4, Q6, Q8, N3 |

**Net:** 20 originally-actionable items → 4 already addressed + 5 worth doing + 11 rejected.

The rejection rate (11/20 = 55%) reflects the framework's maturity. Most apparent gaps were either:
- **Babysitting** — telling the agent what it already does
- **Premature optimization** — token savings without measured pressure
- **Redundancy** — instructions already in place
- **Cosmetic** — uniformity without behavior benefit
- **Self-conflicting** — fixes that violate the framework's own rules

The 5 surviving open items are all genuinely useful and cheap (XS effort each).
