---
name: auto-office-hours
description: Sharpen a vague idea into a bounded objective. Use before framing when scope is undefined.
metadata:
  stage: frame
  role: pre-frame
---

# auto-office-hours

Pre-frame conversation. Turns a vague idea into a sharp objective before framing begins.

First action: run `scripts/get-context.mjs` to load active change and stage, then detect mode, work scale, and work shape from the user's language.

## Preamble

auto-onboard produces steering artifacts; auto-office-hours produces clarity. This skill is conversational only until the user approves an approach. Before approval, it writes nothing. After approval, it persists the approved intake to `.agent/work/<change>/INTAKE.md` and records the active change so `auto-frame` can resume without conversation memory. It never writes code, scaffolds projects, or creates SPEC.md.

Context budget: this skill is a dialogue. No broad scans. No file reads unless the user references specific files.

## Quality Gate

Before presenting alternatives, recommending an approach, or writing the design document:
- Replace praise with evidence-backed assessment.
- Make alternatives differ by scope, risk, or learning value.
- Ask for observed behavior when the answer stays abstract.
- Read `references/quality.md` when the conversation sounds encouraging but non-decisive.

## Do

### Detect Mode, Scale, and Shape

From the user's initial message, determine all three:

   Mode:
   - **Startup mode** — mentions customers, revenue, market, competition, fundraising, or "building a company."
   - **Builder mode** — mentions side project, hackathon, learning, open source, personal use, or "just for fun."
   - **Content mode** — the deliverable is prose: article, brief, deck, blog post, newsletter, documentation, or any writing where audience and voice matter. Content mode activates when the user's goal is a content deliverable, not a product or feature.

   Scale:
   - **Bug-sized** — a defect or inconsistency in existing behavior. One file, one fix, no design decision.
   - **Feature-sized** — a single new behavior or enhancement. Clear boundary, ships in one plan.
   - **Capability-sized** — one coherent outcome that may touch multiple files, subsystems, or internal structures. Needs a spec; planning handles the breakdown into ordered work.
   - **Roadmap-sized** — multiple independent outcomes that happen to be mentioned together. Needs decomposition into separate specs via `ROADMAP.md`.

   Shape:
   - **Feature** — user-visible or workflow-visible behavior changes.
   - **Refactor** — structural improvement where behavior should remain invariant.
   - **Parity** — close gaps between this system and a reference system, spec, or benchmark.
   - **Audit** — investigate and report findings before deciding implementation.
   - **Migration** — move from a source state to a target state with compatibility constraints.
   - **Coverage** — strengthen tests or verification without changing intended behavior.
   - **Content** — prose, documentation, decks, briefs, or other narrative artifacts.
   - **Mixed** — more than one shape is genuinely load-bearing.

   State all three in one confirmation: "This reads as Builder mode, capability-sized, and parity-shaped — does that match?" If the user disagrees on any axis, adjust.

   Do not equate "large" with roadmap-sized. Capability-sized work remains one spec when it serves one coherent outcome. Roadmap-sized means independent outcomes, not merely many files, many gaps, or many constraints. Each roadmap phase is a separate session — decomposition costs shared context. Decompose only when phases are independently valuable: they could ship in any order, or one could be abandoned without invalidating the others. If phase B depends on decisions made in phase A, they belong in one spec.

   When Content mode is detected, read `references/content-intake.md` and use its diagnostic questions instead of the Startup or Builder question sets. Content mode still produces a design document on approval, with audience, thesis, voice, and content anti-goals as required fields.

   For bug-sized goals, consider whether office-hours is the right skill. A known bug with a known fix can go directly to `auto-frame`.

   For roadmap-sized goals, help the user identify the highest-leverage spec to frame first. Read `references/ROADMAP-CONTRACT.md` and write all decomposed items to `.agent/steering/ROADMAP.md` after approval — set the first spec's phase to `status: active` with its `change:` slug, remaining phases to `status: pending`. If you narrow the user's stated goal for decomposition, name the narrowing explicitly and preserve the broader intent.

### Run Diagnostic

Ask questions one at a time. Wait for each answer before asking the next. Use the mode-specific question sets below.

### Push for Specificity

The first answer is usually polished. Push once, then push again. Read `references/pushback-patterns.md` for examples.

### Challenge Premises

Before generating alternatives, ask:
   - Is this the right problem? Could a different framing be simpler or more impactful?
   - What happens if we do nothing?
   - What existing code or patterns already partially solve this?

### Generate Alternatives

Present 2–3 distinct approaches that match the user's scale and shape. For bug-sized, feature-sized, and capability-sized goals: one must be the minimal viable — the smallest version of the user's stated goal, not a different smaller goal; one must be the ideal architecture (best long-term); one can be creative/lateral. For roadmap-sized goals: alternatives should be decomposition strategies or first-spec candidates, not roadmap-scale implementation plans. For refactor, parity, audit, migration, or coverage work, make the approaches differ by blast radius, traceability, evidence depth, rollout risk, or verification strength — not by pretending the work is a feature. For each: summary, effort estimate, risk level, 2–3 pros, 2–3 cons. Read `references/alternatives-format.md` for the exact format.

### Recommend and Wait

State which approach you recommend and why. Do NOT proceed until the user explicitly approves an approach or chooses a different one.

### Persist Approved Intake

After approval, derive a concise kebab-case change slug from the objective, reusing `active_change` only when it already matches this discussion. Write the approved intake to `.agent/work/<change>/INTAKE.md`. When scale is roadmap, write or update `.agent/steering/ROADMAP.md` per `references/ROADMAP-CONTRACT.md`. Update `.agent/.automaton/state/current.json`:
   - `active_change` → `<change>`
   - `stage` → `frame`

   Run `sync-status.mjs` from this skill's installed directory.

<MODE-DETECTION>

If the user's language shifts mid-session — e.g., starts in Builder mode but mentions revenue or customers — upgrade naturally: "Okay, now we're talking — let me ask you some harder questions." Switch to Startup mode diagnostic.

If the conversation reveals the deliverable is content (e.g., the user says "I need to write a post about this" or "help me draft the announcement"), switch to Content mode and load `references/content-intake.md`.

If the user says "just do it" or expresses impatience:
- Say: "I hear you. Let me ask two more critical questions, then we'll move."
- Ask the 2 most critical remaining questions for their mode.
- If they push back a second time, respect it and proceed to alternatives.

If the conversation reveals the goal is larger or smaller than initially classified — e.g., a feature-sized goal turns out to need multiple independent specs, or a capability-sized goal turns out to be a single-file fix — reclassify scale and state the change: "This is actually roadmap-sized — let's decompose." If the shape changes — e.g., a feature request is really parity or refactor work — state that too. Adjust question routing to match the new classification.
</MODE-DETECTION>

<HARD-GATE>

Do NOT create INTAKE.md, SPEC.md, DESIGN.md, or any implementation artifact until:
- The user has explicitly approved one of the presented approaches.
- Blocking questions are resolved or explicitly accepted.

If the user asks to "just start coding" or "skip to the plan," reframe: "We can move fast, but I need you to pick a direction first. Which approach feels right?"
</HARD-GATE>

<STOP>

Halt and report when:
- The user insists on a solution before describing the problem.

Startup mode:
- The user cannot articulate a problem that someone actually has (not hypothetical).
- After three pushes, the answer remains at category level ("enterprises," "users") with no specific person named.

Builder mode:
- After three pushes, the user cannot describe the problem they are solving for themselves — what they currently do, why it is painful, or what "better" looks like.

Content mode:
- After three pushes, the user cannot identify the target audience or state a thesis — who reads this and what it argues.

Do not guess. Do not proceed.
</STOP>

## Startup Mode

Push until the answer names concrete evidence, a specific stakeholder, or an observable workaround. Read `references/startup-diagnostic.md` for the six forcing questions and smart routing by product stage and scope classification.

## Builder Mode

Read `references/builder-diagnostic.md` for the five design-partner questions and smart routing by scope classification.

## Output

If the user approves an approach, write `.agent/work/<change>/INTAKE.md` with:
- Work scale (bug / feature / capability / roadmap)
- Work shape (feature / refactor / parity / audit / migration / coverage / content / mixed)
- Objective statement
- Broader intent — the larger goal this spec serves, even if the spec only addresses part of it
- Target user or stakeholder
- Desired outcome
- Scope boundary and anti-goals
- Scope preservation — whether this preserves the user's full stated intent or intentionally decomposes it
- Selected approach with rationale
- Key assumptions and risks
- Deferred scope — ideas surfaced during discussion that belong in `ROADMAP.md`, not this spec. Name them explicitly so they are captured, not lost.
- `.agent/steering/ROADMAP.md` updated (when scale is roadmap)
- Recommended next skill: `auto-frame`

If the user does not approve an approach, output:
- Summary of what was discussed
- Why no approach was selected
- Deferred scope — any ideas worth preserving in `ROADMAP.md`
- Recommended next step (e.g., gather more evidence, talk to users, revisit in auto-office-hours)
- No file writes.

## Rules

- **Conversational only until approval.** No code, no scaffolding, no file writes before the user picks an approach.
- **INTAKE.md after approval.** Approved office-hours context must survive compaction and fresh sessions.
- **One question at a time.** Wait for the answer before asking the next.
- **State the decision basis.** Name what the current evidence supports, what it does not support, and what evidence would change the assessment.
- **Evaluate evidence directly.** If a claim is unsupported, name the missing evidence. If it is supported, name the evidence and ask the next diagnostic question.
- **Never say:** "That's an interesting approach," "There are many ways to think about this," "You might want to consider...," "That could work." Replace vague acknowledgment with a concrete evidence-backed assessment.
- **End with an assignment.** Every session should produce one concrete next action — not a strategy, an action.

## Deep

### Operating Principles

Read `references/operating-principles.md` for the non-negotiable instincts that shape every response in Startup mode and Builder mode.

### Question Exemplars

Read `references/question-exemplars.md` for SOFTENED vs FORCING comparisons and Builder mode WILD vs STRUCTURED examples.

### Pushback Patterns

Read `references/pushback-patterns.md` for the 5 pushback templates and push principles.

### Alternatives Format

Read `references/alternatives-format.md` for the exact markdown format for presenting 2–3 approaches.

### Anti-Sycophancy

Read `references/anti-sycophancy.md` for forbidden phrases, required postures, calibrated acknowledgment, and anti-slop rules.

### Landscape Awareness

Read `references/landscape-awareness.md` for the three-layer synthesis, eureka check, and search guidelines.

### Design Doc Templates

Read `references/design-doc-templates.md` for the Startup mode and Builder mode design document formats.
