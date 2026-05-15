---
name: auto-frame
description: Clarify, bound, and de-risk a request before planning. Use when scope is unclear, requirements conflict, or lenses must be chosen. Output is always SPEC.md.
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: frame
  role: controller
---

# auto-frame

Clarify, bound, and de-risk a request before planning. Use when scope is unclear, requirements conflict, or lenses must be chosen. Output is always `SPEC.md`.

First action: run `scripts/get-context.mjs` from this skill's installed directory to load active change and stage. Read `STATUS.md` for open blockers.

## Preamble

auto-frame always produces the canonical artifact: `SPEC.md`. If you leave this skill without a valid SPEC.md written to disk, you have failed. This skill does not write code, does not create PLAN.md, and does not proceed to planning without a written spec.

Context budget: `SPEC.md` is the reloadable contract, not the entire body of detail. Keep it compact enough to re-read, but do not narrow a coherent goal just to keep the file short. For larger coherent work, summarize the contract in SPEC.md and link detail files under `spec/*.md`, such as `constraints.md`, `gap-matrix.md`, `risks.md`, or `acceptance-detail.md`. The primary scope check is coherence: one outcome = one spec, even when it needs progressive disclosure.

## Quality Gate

Before finalizing `SPEC.md`:
- Make the objective observable.
- Move implementation detail out unless it constrains scope.
- Mark uncertain claims as assumptions.
- Read `references/quality.md` when the spec feels broad, padded, or hard to verify.

## Do

### 1. Restate

If `.agent/work/<active_change>/INTAKE.md` exists, read it before interviewing. If no intake exists but office-hours context is present in the conversation (design document, work scale, work shape, broader intent), read that instead. Adopt the scale, shape, and broader intent to calibrate constraints and interview depth. Do not re-ask what office-hours already established.

State the goal in one sentence. If you cannot, ask one clarifying question and stop.

If your SPEC would be narrower than the user's stated goal or office-hours broader intent, either widen the SPEC, explicitly record the narrowing as decomposition with deferred scope in `ROADMAP.md`, or ask for confirmation. Silent narrowing is a framing failure.

### 2. Surface

List the constraints, unknowns, and risks that change implementation. Keep the decision-critical summary in `SPEC.md`. If the set is large but coherent, summarize it here and write `spec/constraints.md`, `spec/risks.md`, or another linked detail file instead of dropping requirements. If constraints address unrelated outcomes, ask which outcome to frame first.

### 3. Select Lenses

Choose the minimum from: `product`, `engineering`, `design`, `security`, `runtime`. Default is `product` + `engineering` unless the user says otherwise.

If the change involves content creation (writing, articles, briefs, decks, newsletters, documentation), add the content lens. Read `references/content-framing.md` for content-aware SPEC.md fields (audience, thesis, voice direction, content anti-goals) and the anti-slop checklist. Content lens supplements existing lenses — it does not replace `product` or `engineering`.

Read `references/lens-selection.md` for the decision matrix if the choice is not obvious.

### 4. Interview (if needed)

<INTERVIEW>

If the goal is clear and lenses are obvious, skip this.

If anything is ambiguous, ask ≤ 3 questions total for feature-sized goals. For capability-sized goals that did not come through office-hours, up to 5. One per message. Prefer multiple-choice. No open-ended brainstorming.

Questions must materially change the spec. Do not ask for preferences that don't affect scope.
</INTERVIEW>

### 5. Write SPEC.md

Read `references/ARTIFACT-LIFECYCLE.md` for frame-stage handoff, progressive disclosure, and state pointer boundaries. If a `SPEC.md` already exists for this change, read it and preserve all `## Review:` sections.

<HARD-GATE>

Do NOT proceed past this step without writing `SPEC.md` to `.agent/work/<change>/SPEC.md`.

The file must contain:
- Bounded goal (1 sentence)
- Broader intent (the larger user goal this spec preserves or intentionally decomposes)
- Work scale and work shape (or "not classified" with rationale)
- Selected lenses (list)
- Constraints and risks that change implementation, summarized when detail is linked
- Required outcome in the shape the work needs: behavior, structural change, invariants, parity target, audit questions, migration target, coverage target, or content target
- Acceptance criteria or traceable requirement matrix (auto-verify checks these)
- Linked detail files under `spec/` when the work needs progressive disclosure, or "none"
- Blocking questions or assumptions (list, or "none")
- Anti-goals (what this change explicitly does not do)

If a `SPEC.md` already exists, refresh it. Preserve all `## Review:` sections.
</HARD-GATE>

### 6. Update State

Run `sync-status.mjs` from this skill's installed directory.
Update `.agent/.automaton/state/current.json`:
- `canonical_spec` → path to the SPEC.md you just wrote
- `stage` → `frame` (or `plan` if user approved and no review needed)

## Output

- **SPEC.md** — written to `.agent/work/<change>/SPEC.md` (mandatory)
- `.agent/.automaton/state/current.json` updated with `canonical_spec`
- Recommended next skill: `auto-ceo-review`, `auto-plan`, or `auto-office-hours`

## Rules

- **SPEC.md is mandatory.** No file, no completion. Conversational framing without a written artifact is not auto-frame.
- Ask ≤ 3 questions (up to 5 for capability-sized goals without office-hours context). If you need more, the user is not ready to frame.
- Do not start implementation. Do not write code. Do not create PLAN.md.
- Keep notes operational. No essays.
- Preserve review sections on refresh.

## Deep

### Edge Case: User tries to skip spec writing

User: "Just plan it, I already told you what I want."

You: "I need 30 seconds to write this down so the next session doesn't start from zero. Here's the spec — confirm or edit:"

Then write SPEC.md immediately and ask for confirmation, not permission.

### Edge Case: Multiple subsystems

Split genuinely independent work. If the request describes unrelated systems with separate outcomes ("build chat, billing, and analytics"), tell the user: "These are independent changes. Which one should we frame first?"

Keep related work together. If multiple files or subsystems must change to achieve one coherent behavioral goal ("adjust two skills so they handle broader scope"), that is one spec — not three. The test: do the acceptance criteria point at one outcome or several unrelated ones? One outcome = one spec, regardless of how many files it touches.

### Work Shapes

Choose sections that fit the work; do not force every SPEC into a feature template. Refactor work should name structural changes, behavioral invariants, blast radius, and regression proof. Parity work should name the reference source, gap matrix, requirement IDs, target conformance state, and verification by gap ID. Audit work should name questions, evidence sources, finding schema, and decision gate. Migration work should name source state, target state, compatibility constraints, rollout or rollback, and verification. Coverage work should name target risk areas, expected coverage improvement, and regression proof.

### Lens Selection Matrix

Read `references/lens-selection.md` for the full decision matrix with examples.

### Content Framing

Read `references/content-framing.md` for content-aware SPEC.md fields and the anti-slop checklist. Load only when the change involves content creation.
