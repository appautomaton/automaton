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

auto-frame produces exactly one artifact: `SPEC.md`. If you leave this skill without a valid SPEC.md written to disk, you have failed. This skill does not write code, does not create PLAN.md, and does not proceed to planning without a written spec.

Context budget: the spec itself should fit in ~5% of the context window. A feature-sized spec typically lands under 200 lines. A capability-sized spec — one coherent behavioral goal that touches multiple files or subsystems — may reach 250–300 lines. Beyond 300 lines, the spec likely bundles independent work and should be split. The primary scope check is coherence, not line count: a spec is right-sized when all its acceptance criteria contribute to a single observable behavior change.

## Quality Gate

Before finalizing `SPEC.md`:
- Make the objective observable.
- Move implementation detail out unless it constrains scope.
- Mark uncertain claims as assumptions.
- Read `references/quality.md` if the spec feels broad, padded, or hard to verify.

## Do

### 1. Restate

If office-hours context is present in the conversation (design document, scope classification, broader intent), read it. Adopt the scope classification and broader intent to calibrate constraints and interview depth. Do not re-ask what office-hours already established.

State the goal in one sentence. If you cannot, ask one clarifying question and stop.

### 2. Surface

List only the constraints, unknowns, and risks that change implementation. For feature-sized goals, 5 items is the typical ceiling. Capability-sized goals with genuinely distinct constraints may surface 6–8. If the list exceeds 8, or if constraints address unrelated outcomes, the spec likely bundles independent work — ask the user which outcome to focus on.

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

Read `references/ARTIFACT-LIFECYCLE.md` for frame-stage handoff and state pointer boundaries. If a `SPEC.md` already exists for this change, read it and preserve all `## Review:` sections.

<HARD-GATE>

Do NOT proceed past this step without writing `SPEC.md` to `.agent/work/<change>/SPEC.md`.

The file must contain:
- Bounded goal (1 sentence)
- Selected lenses (list)
- Constraints (typically ≤ 5; 6–8 for coherent capability-sized goals)
- Required behavior (what must observably change)
- Acceptance criteria (how we know it is done — auto-verify checks these)
- Blocking questions or assumptions (list, or "none")
- Anti-goals (what this change explicitly does not do)

If a `SPEC.md` already exists, refresh it. Preserve all `## Review:` sections.
</HARD-GATE>

### 6. Update State

Run this skill's installed `sync-status.mjs` from the same host skill root to align `STATUS.md` with the current state.

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

### Lens Selection Matrix

Read `references/lens-selection.md` for the full decision matrix with examples.

### Content Framing

Read `references/content-framing.md` for content-aware SPEC.md fields and the anti-slop checklist. Load only when the change involves content creation.
