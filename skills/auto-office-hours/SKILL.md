---
name: auto-office-hours
description: Sharpen a vague idea into a bounded objective. Use before framing when scope is undefined.
metadata:
  stage: frame
---

# auto-office-hours

Pre-frame conversation. Turns a vague idea into a sharp objective before framing begins.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding. Then detect mode, work scale, and work shape from the user's language.

## Preamble

auto-onboard produces steering artifacts; auto-office-hours produces clarity. This skill is conversational only until the user approves an approach. Before approval, it writes nothing. After approval, it persists the approved intake to `.agent/work/<change>/INTAKE.md` and records the active change so `auto-frame` can resume without conversation memory. This skill does not write code or scaffold projects. It does not create SPEC.md in conversational mode; when approved intake is enough to frame safely, continue into `auto-frame`'s contract in the same session so the user does not have to ask again.

Loading discipline: hold the conversation goal, evidence, request coverage, rejected framings, and the next decision. Read project files only when evidence in the repo changes the objective, especially for parity, audit, migration, coverage, or mixed work.

## Quality Gate

Before presenting alternatives, recommending an approach, or writing `INTAKE.md`:
- Replace praise with evidence-backed assessment.
- Confirm request coverage before narrowing scope or deferring work.
- Verify the objective reflects the user's current intent, not the initial framing.
- Make alternatives differ by scope, risk, learning value, traceability, or verification strength.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when the conversation sounds encouraging but non-decisive.

## Do

### Classify The Work

Determine and confirm all three axes:

- **Mode:** Startup mode for customers, revenue, market, competition, fundraising, or company-building; Builder mode for side project, hackathon, learning, open source, personal use, or just-for-fun; Content mode for writing, article, brief, deck, blog post, newsletter, documentation, or any prose where audience and voice matter.
- **Work scale:** bug-sized, feature-sized, capability-sized, or roadmap-sized. Do not equate "large" with roadmap-sized. Capability-sized work remains one spec when it serves one coherent outcome; roadmap-sized means multiple independently valuable outcomes that need decomposition through `ROADMAP.md`.
- **Work shape:** feature, refactor, parity, audit, migration, coverage, content, or mixed.

State all three in one confirmation, for example: "This reads as Builder mode, capability-sized, and parity-shaped. Does that match?" If the user disagrees on any axis, adjust before continuing.

For bug-sized goals with a known fix, consider whether `auto-frame` is the better next skill. For Content mode, read `references/content-intake.md` (~61 lines) and use its audience, thesis, anti-goals, and voice diagnostics. For roadmap-sized goals, read `.agent/.automaton/references/ROADMAP-CONTRACT.md` (~63 lines), help choose the first spec, and preserve the broader intent while decomposing.

### Run Diagnostic

Ask only the questions needed to make the objective frameable. Use the active mode reference:
- Startup Mode: read `references/startup-diagnostic.md` when demand, user, market, or customer evidence matters.
- Builder Mode: read `references/builder-diagnostic.md` when the work is personal, exploratory, open-source, or design-partner shaped.
- Content Mode: read `references/content-intake.md` when the deliverable is prose.

When the shape is not feature, shape-specific questions take priority over mode questions: parity needs a reference system and gap-closure target; audit needs questions and decision use; refactor needs invariants and blast radius; migration needs source/target state and rollback; coverage needs risk areas and verification target; mixed work needs the highest-priority question from each shape.

Follow up immediately when an answer changes scope, reveals a constraint, contradicts earlier context, or stays abstract. Do not bank questions. If the first answer is polished but vague, push on the substance and ask for observed behavior.

### Request Coverage

Before generating alternatives, build a compact coverage map from the user's request and answers. Capture the goal, context/background, perspectives or audiences, constraints, worries/risks, explicit asks, and implied asks.

Classify each material item as:
- **Included** in the current change.
- **Deferred** to `ROADMAP.md` or later work, with the reason.
- **Anti-goal** for this change.
- **Needs decision** because the answer would change scope, approach, or verification.

If any item would be narrowed or dropped, name the reason. If a decision is needed, ask one focused question or offer 2–3 concrete options before recommending an approach. Keep this as a decision map, not a transcript.

### Generate Alternatives

Present 2–3 distinct approaches that match the user's scale and shape. For bug-sized, feature-sized, and capability-sized goals, include a minimal viable option and an ideal architecture option. For roadmap-sized goals, offer decomposition strategies or first-spec candidates, not roadmap-scale implementation plans. For refactor, parity, audit, migration, or coverage work, differentiate by blast radius, traceability, evidence depth, rollout risk, or verification strength. Read `references/alternatives-format.md` (~34 lines) for the exact format.

### Recommend And Wait

Recommend one approach and explain the decision basis: what evidence supports it, what it does not prove, and what evidence would change the recommendation. Do NOT proceed until the user explicitly approves an approach or chooses a different one.

### Persist Approved Intake

After approval, derive a date-prefixed change slug: `YYYY-MM-DD-<kebab-case-objective>` using today's date (e.g., `2026-05-20-production-pme-runtime`). Reuse `active_change` only when it already matches this discussion. Write the approved intake to `.agent/work/<change>/INTAKE.md`. When scale is roadmap, replace `.agent/steering/ROADMAP.md` with the approved decomposition per `.agent/.automaton/references/ROADMAP-CONTRACT.md`. Update `.agent/.automaton/state/current.json`:
   - `active_change` → `<change>`
   - `stage` → `frame`

   Run `node .agent/.automaton/scripts/sync-status.mjs` from the project root.

### Continue To Frame When Ready

After `INTAKE.md` is written, continue into `auto-frame` in the same session when all of these are true:
- The approved intake states the objective in one sentence.
- Scope coverage has no unresolved `Needs decision` item that would change scope, approach, or verification.
- The target stakeholder or artifact, desired outcome, constraints, anti-goals, and key risks are clear enough to produce acceptance criteria.
- The host/session can write `SPEC.md` without dropping material request context.

If those conditions pass, load and follow `auto-frame`'s contract, write `.agent/work/<change>/SPEC.md`, update `canonical_spec`, and report both artifacts. If any condition fails, stop after `INTAKE.md` with the concrete blocker or focused question. Do not make the user manually invoke `auto-frame` just because office-hours wrote intake successfully.

<MODE-DETECTION>

If the user's language shifts mid-session, reclassify mode, scale, or shape and state the change. If the user says "just do it" or expresses impatience, ask the two most critical unresolved questions; if they push back again, proceed to alternatives with explicit assumptions.
</MODE-DETECTION>

<GATE>

Do NOT create INTAKE.md, SPEC.md, DESIGN.md, or any implementation artifact until:
- The user has explicitly approved one of the presented approaches.
- Blocking questions are resolved or explicitly accepted.

If the user asks to "just start coding" or "skip to the plan," reframe: "We can move fast, but I need you to pick a direction first. Which approach feels right?" There are no file writes before the user picks an approach.
</GATE>

<STOP>

Halt and report when:
- The user insists on a solution before describing the problem.
- Startup mode cannot name a problem someone actually has, or after three pushes the answer still lacks a specific person or stakeholder.
- Builder mode cannot describe what the user currently does, why it is painful, or what better looks like.
- Content mode cannot identify the target audience or state a thesis.

Push until the answer names concrete evidence, a specific stakeholder, or an observable workaround. Do not guess. Do not proceed.
</STOP>

## Output

`INTAKE.md` is guaranteed only for an approved office-hours session; aborted, skipped, or still-conversational sessions do not produce it.

If the user approves an approach, write `.agent/work/<change>/INTAKE.md` with:
- Work scale (bug / feature / capability / roadmap)
- Work shape (feature / refactor / parity / audit / migration / coverage / content / mixed)
- Objective statement — must reflect the user's final refined wording, not the initial framing or the agent's reinterpretation
- Broader intent: the larger goal this spec serves, even if the spec only addresses part of it
- Target user or stakeholder
- Desired outcome
- Scope boundary and anti-goals
- Rejected framings: directions the user explicitly ruled out during conversation, with their reasoning
- Scope preservation: whether this preserves the user's full stated intent or intentionally decomposes it
- Scope coverage: included, deferred, anti-goals, and needs-decision items; omit empty groups
- Selected approach with one-line rationale; do not preserve the full alternatives analysis unless the user asked for it as a deliverable
- Key assumptions and risks that change execution
- Deferred scope: material ideas that belong in `ROADMAP.md`, not this spec
- `.agent/.automaton/state/current.json` updated with `active_change` and `stage: frame`
- `.agent/steering/ROADMAP.md` updated when scale is roadmap
- Diagnostic handling: `error`-level diagnostics block the intake; `warning`-level diagnostics surface to `auto-frame`
- Handoff: continue into `auto-frame`'s contract when the approved intake is frame-ready; otherwise recommend `auto-frame` with the specific missing condition. The user or host invokes the next skill; auto-office-hours does not chain.

The INTAKE is a faithful record of what the user approved, not the agent's editorial rewrite. Use the user's language where possible. When the agent reframed something and the user accepted the reframe, capture the accepted version and note it was a reframe.

If the user does not approve an approach, output a short discussion summary, why no approach was selected, deferred scope worth preserving in `ROADMAP.md`, a recommended next step, and no file writes.

## Rules

- **Conversational only until approval.** No code, no scaffolding, no file writes before the user picks an approach.
- **INTAKE.md after approval.** Approved office-hours context must survive compaction and fresh sessions.
- **Continue when frame-ready.** Approved, complete intake should flow into `auto-frame` without another user prompt.
- **Do not bank questions.** Ask probe questions when they are relevant, with context.
- **State the decision basis.** Name what the current evidence supports, what it does not support, and what evidence would change the assessment.
- **Evaluate evidence directly.** If a claim is unsupported, name the missing evidence. If it is supported, name the evidence and ask the next diagnostic question.
- **Do not drop request context silently.** Every material ask, context detail, perspective, or worry is included, deferred with reason, marked as an anti-goal, or turned into a focused question.
- **Compact intake.** INTAKE.md is a decision record, not a transcript. Omit empty sections and analysis nobody downstream needs.
- **Never say:** "That's an interesting approach," "There are many ways to think about this," "You might want to consider...," "That could work." Replace vague acknowledgment with a concrete evidence-backed assessment.
- **End with an assignment.** Every session should produce one concrete next action, not a strategy, an action.

## Deep

### Operating Principles

Read `references/operating-principles.md` for non-negotiable instincts in Startup and Builder modes. (~43 lines.)

### Question Exemplars

Read `references/question-exemplars.md` when question quality is drifting soft or generic. (~55 lines.)

### Pushback Patterns

Read `references/pushback-patterns.md` when the user gives vague market, social proof, platform vision, growth, or undefined-term answers. (~40 lines.)

### Alternatives Format

Read `references/alternatives-format.md` before presenting approaches. (~34 lines.)

### Anti-Sycophancy

Read `references/anti-sycophancy.md` when the response risks sounding agreeable instead of evidence-backed. (~36 lines.)

### Landscape Awareness

Read `references/landscape-awareness.md` when market, ecosystem, competitor, or current-state evidence would change the frame. (~48 lines.)

### Intake Templates

Startup mode: read `references/startup-intake-template.md` before writing INTAKE.md. (~80 lines.)

Builder and Content modes: read `references/builder-intake-template.md` before writing INTAKE.md. (~78 lines.)
