---
name: auto-frame
description: Bound and de-risk a request into SPEC.md. Use when the objective is clear but scope needs constraining.
metadata:
  stage: frame
---

# auto-frame

Framing controller. Bounds and de-risks a request into a single `SPEC.md`.

First action: run `scripts/get-context.mjs` → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding. Read `STATUS.md` for open blockers.

## Preamble

auto-frame always produces the canonical artifact: `SPEC.md`. If you leave this skill without a valid SPEC.md written to disk, you have failed. This skill does not write code, does not create PLAN.md, and does not proceed to planning without a written spec.

Context budget: `SPEC.md` is the reloadable contract, not the entire body of detail. Keep it compact enough to re-read, but do not narrow a coherent goal just to keep the file short. For larger coherent work, summarize the contract in SPEC.md and link detail files under `spec/*.md`, such as `constraints.md`, `gap-matrix.md`, `risks.md`, or `acceptance-detail.md`. The primary scope check is coherence: one outcome = one spec, even when it needs progressive disclosure.

Read and explore project files when understanding the codebase helps produce an accurate spec — existing implementations, patterns, module boundaries, and current state all inform constraints, risks, and acceptance criteria. Avoid exhaustive tree walks; read what you need to ground the spec in reality.

## Quality Gate

Before finalizing `SPEC.md`:
- Make the objective observable.
- Move implementation detail out unless it constrains scope.
- Mark uncertain claims as assumptions.
- Read `references/quality.md` (~38 lines: anti-patterns, better shape, prose hygiene scan patterns) when the spec feels broad, padded, or hard to verify.

## Do

### Restate

If `.agent/work/<active_change>/INTAKE.md` exists, read it before interviewing. If no intake exists but approved office-hours context is present in the conversation (work scale, work shape, broader intent, scope coverage, or rejected framings), read that instead. Adopt the scale, shape, broader intent, target user or stakeholder, scope coverage, and rejected framings to calibrate constraints and interview depth. Do not re-ask what office-hours already established. Do not reintroduce directions the user explicitly rejected — if INTAKE.md includes rejected framings, treat them as hard constraints on the spec.

State the goal in one sentence. If you cannot, ask one clarifying question and stop.

If your SPEC would be narrower than the user's stated goal or office-hours broader intent, either widen the SPEC, explicitly record the narrowing as decomposition with deferred scope in `.agent/steering/ROADMAP.md` (using the format in `references/ROADMAP-CONTRACT.md`), or ask for confirmation. Silent narrowing is a framing failure. A spec that covers a large coherent outcome is better than splitting into roadmap phases that lose shared context. Let the plan carry complexity through ordered slices.

### Coverage Check

If `INTAKE.md` or conversation context includes `Scope Coverage`, compare the intended SPEC scope against each item before writing:
- Included items must appear in the bounded goal, required outcome, constraints, risks, or acceptance criteria.
- Deferred items must stay deferred with a reason in ROADMAP.md or a SPEC deferred-scope note.
- Anti-goals must appear in SPEC anti-goals.
- Needs-decision items require one focused question or 2–3 concrete options before SPEC unless the user explicitly accepts an assumption.

If no formal `Scope Coverage` exists but the request has multiple material asks, perspectives, constraints, or worries, build this lightweight check from the available context. Do not drop a material item silently just to make the SPEC shorter.

### Surface

List the constraints, unknowns, and risks that change implementation. Keep the decision-critical summary in `SPEC.md`. If the set is large but coherent, summarize it here and write `spec/constraints.md`, `spec/risks.md`, or another linked detail file instead of dropping requirements. If constraints address unrelated outcomes, ask which outcome to frame first.

### Select Lenses

Choose the minimum from: `product`, `engineering`, `design`, `security`, `runtime`. Default is `product` + `engineering` unless the user says otherwise.

If the change involves content creation (writing, articles, briefs, decks, newsletters, documentation), add the content lens. Read `references/content-framing.md` (~82 lines) for content-aware SPEC.md fields (audience, thesis, voice direction, content anti-goals) and the anti-slop checklist. Content lens supplements existing lenses; it does not replace `product` or `engineering`.

Read `references/lens-selection.md` (~28 lines) for the decision matrix if the choice is not obvious.

### Interview (if ambiguous)

<INTERVIEW>

If the goal is clear and lenses are obvious, skip this.

If anything is ambiguous, ask questions that materially change the spec. Do not ask for preferences that don't affect scope. Prefer multiple-choice when offering options. Do not bank questions — ask them when they're relevant, with context for why the answer matters to the spec. The agent decides how many questions to ask and how to present them based on what produces the highest-quality spec.

If INTAKE.md includes needs-decision items or unresolved assumptions, address those first. Do not re-ask what office-hours already established, but do follow up on things office-hours didn't resolve.
</INTERVIEW>

### Write SPEC.md

If a `SPEC.md` already exists for this change, read it and preserve all `## Review:` sections.

<HARD-GATE>

Do NOT proceed past this step without writing `SPEC.md` to `.agent/work/<change>/SPEC.md`.

Do NOT write `SPEC.md` while a needs-decision item would change scope, approach, or verification unless the user answers it or explicitly accepts an assumption.

The file must contain these **core** fields (always present):
- Bounded goal (1 sentence)
- Broader intent (the larger user goal this spec preserves or intentionally decomposes)
- Work scale and work shape (or "not classified" with rationale)
- Selected lenses (list)
- Constraints and risks that change implementation, summarized when detail is linked
- Required outcome in the shape the work needs: behavior, structural change, invariants, parity target, audit questions, migration target, coverage target, or content target — describes the *shape* of the change
- Acceptance criteria or traceable requirement matrix (auto-verify checks these) — describes the *testable checks*; must not mirror Required outcome
- Anti-goals (what this change explicitly does not do)

These fields are **conditional** — include only when the named trigger applies, otherwise omit entirely:
- Linked detail files under `spec/` — trigger: SPEC needs progressive disclosure (constraints, gap matrix, risks, or acceptance detail too large for inline)
- Target user or stakeholder — trigger: product, design, or content lens is selected, or `INTAKE.md` names one
- Scope coverage decisions — trigger: intake or request includes multiple material asks, perspectives, deferrals, anti-goals, or needs-decision items
- Blocking questions or assumptions — trigger: present and material; omit when "none" rather than writing the literal word "none"

Apply the Artifact Signal Discipline rules from `references/ARTIFACT-LIFECYCLE.md` while writing: no mirror sections, index over transcript, append-replace not stack. If a `SPEC.md` already exists, refresh it and replace prior `## Review:` sections on re-run for the same change — do not stack reviews.
</HARD-GATE>

### Update State

If `active_change` is `bootstrap` or does not match the current objective, derive a new slug: `YYYY-MM-DD-<kebab-case-objective>` using today's date (e.g., `2026-05-20-session-auth-jwt`). Update `active_change` before writing SPEC.md so the work folder uses the new slug.

Run `sync-status.mjs` from this skill's installed directory → writes STATUS.md frontmatter from current.json, outputs `{synced, statusPath, active_change, stage}`.
Update `.agent/.automaton/state/current.json`:
- `active_change` → `<change>` (when derived or changed)
- `canonical_spec` → path to the SPEC.md you just wrote
- `stage` → `frame` (or `plan` if user approved and no review needed)

## Output

- **SPEC.md**: written to `.agent/work/<change>/SPEC.md` (mandatory)
- `.agent/.automaton/state/current.json` updated with `canonical_spec`; `stage` stays `frame` unless the user approves direct plan handoff
- Diagnostic handling: `error`-level diagnostics block advancement; `warning`-level diagnostics surface to the next stage
- Recommended next skill: `auto-ceo-review`, `auto-plan`, or `auto-office-hours`. The user or host invokes the next skill; auto-frame does not require nested invocation.

## Rules

- **SPEC.md is mandatory.** No file, no completion. Conversational framing without a written artifact is not auto-frame.
- Ask ≤ 3 questions (up to 5 for capability-sized goals without office-hours context). If you need more, the user is not ready to frame.
- Keep notes operational. No essays.
- Preserve review sections on refresh.

## Deep

### Lens Selection Matrix

Read `references/lens-selection.md` for the full decision matrix with examples. (~28 lines: 5-question decision tree, 6 example mappings, 3 anti-patterns.)

### Content Framing

Read `references/content-framing.md` for content-aware SPEC.md fields and anti-slop checklist. (~82 lines: audience/thesis/voice/anti-goals field definitions with good/bad examples, 10-pattern anti-slop checklist, lens interaction rules, Pass 2 dimensions.)

### Artifact Lifecycle

Read `references/ARTIFACT-LIFECYCLE.md` when state pointers conflict or progressive disclosure layout is unclear. (~105 lines: stage handoffs table, progressive disclosure layout with allowed paths, review verdict routing, STOP conditions.)

### Edge Case: User tries to skip spec writing

User: "Just plan it, I already told you what I want."

You: "I need 30 seconds to write this down so the next session doesn't start from zero. Here's the spec, confirm or edit:"

Then write SPEC.md immediately and ask for confirmation, not permission.

### Edge Case: Multiple subsystems

Split genuinely independent work. If the request describes unrelated systems with separate outcomes ("build chat, billing, and analytics"), tell the user: "These are independent changes. Which one should we frame first?"

Keep related work together. If multiple files or subsystems must change to achieve one coherent behavioral goal ("adjust two skills so they handle broader scope"), that is one spec, not three. The test: do the acceptance criteria point at one outcome or several unrelated ones? One outcome = one spec, regardless of how many files it touches.

### Work Shapes

Choose sections that fit the work; do not force every SPEC into a feature template. Refactor work should name structural changes, behavioral invariants, blast radius, and regression proof. Parity work should name the reference source, gap matrix, requirement IDs, target conformance state, and verification by gap ID. Audit work should name questions, evidence sources, finding schema, and decision gate. Migration work should name source state, target state, compatibility constraints, rollout or rollback, and verification. Coverage work should name target risk areas, expected coverage improvement, and regression proof.
