---
name: auto-office-hours
description: Turn a vague idea into a sharp objective through structured conversation. Use when the user says "I have an idea," "help me think through this," "is this worth building," or any request that precedes a spec.
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: frame
  role: pre-frame
---

# auto-office-hours

Turn a vague idea into a sharp objective through structured conversation. Use this skill when the user says "I have an idea," "help me think through this," "is this worth building," or any request that precedes a spec.

First action: detect mode and classify scope from the user's language. If they mention customers, revenue, market, or competition → Startup mode. If they mention side project, hackathon, learning, or open source → Builder mode. If the request is about content creation → Content mode. Classify scope as bug-sized, feature-sized, capability-sized, or roadmap-sized. State the detected mode and scope, and confirm both.

## Preamble

auto-onboard produces steering artifacts; auto-office-hours produces clarity. This skill is conversational only until the user approves an approach. It never writes code, never scaffolds projects, and never creates SPEC.md without explicit approval.

Context budget: this skill is a dialogue. No broad scans. No file reads unless the user references specific files.

## Quality Gate

Before presenting alternatives, recommending an approach, or writing the design document:
- Replace praise with evidence-backed assessment.
- Make alternatives differ by scope, risk, or learning value.
- Ask for observed behavior when the answer stays abstract.
- Read `references/quality.md` if the conversation starts sounding encouraging but non-decisive.

## Do

1. **Detect mode and classify scope.** From the user's initial message, determine both:

   Mode:
   - **Startup mode** — mentions customers, revenue, market, competition, fundraising, or "building a company."
   - **Builder mode** — mentions side project, hackathon, learning, open source, personal use, or "just for fun."
   - **Content mode** — the deliverable is prose: article, brief, deck, blog post, newsletter, documentation, or any writing where audience and voice matter. Content mode activates when the user's goal is a content deliverable, not a product or feature.

   Scope:
   - **Bug-sized** — a defect or inconsistency in existing behavior. One file, one fix, no design decision.
   - **Feature-sized** — a single new behavior or enhancement. Clear boundary, ships in one plan.
   - **Capability-sized** — a coherent behavioral goal that touches multiple files or subsystems but serves one outcome. Needs a spec; planning handles the breakdown into ordered work.
   - **Roadmap-sized** — multiple independent goals that happen to be mentioned together. Needs decomposition into separate specs via `ROADMAP.md`.

   State both in one confirmation: "This reads as Builder mode and capability-sized — does that match?" If the user disagrees on either, adjust.

   When Content mode is detected, read `references/content-intake.md` and use its diagnostic questions instead of the Startup or Builder question sets. Content mode still produces a design document on approval, with audience, thesis, voice, and content anti-goals as required fields.

   For bug-sized goals, consider whether office-hours is the right skill. A known bug with a known fix can go directly to `auto-frame`.

   For roadmap-sized goals, help the user identify the highest-leverage spec to frame first, and recommend the rest be captured in `ROADMAP.md`.

2. **Run the diagnostic.** Ask questions one at a time. Wait for each answer before asking the next. Use the mode-specific question sets below.

3. **Push for specificity.** The first answer is usually polished. Push once, then push again. Read `references/pushback-patterns.md` for examples.

4. **Challenge premises.** Before generating alternatives, ask:
   - Is this the right problem? Could a different framing be simpler or more impactful?
   - What happens if we do nothing?
   - What existing code or patterns already partially solve this?

5. **Generate alternatives.** Present 2–3 distinct approaches that match the user's scope classification. For bug-sized, feature-sized, and capability-sized goals: one must be the minimal viable — the smallest version of the user's goal, not a different smaller goal; one must be the ideal architecture (best long-term); one can be creative/lateral. For roadmap-sized goals: alternatives should be decomposition strategies or first-spec candidates, not roadmap-scale implementation plans. For each: summary, effort estimate, risk level, 2–3 pros, 2–3 cons. Read `references/alternatives-format.md` for the exact format.

6. **Recommend and wait.** State which approach you recommend and why. Do NOT proceed until the user explicitly approves an approach or chooses a different one.

<MODE-DETECTION>

If the user's language shifts mid-session — e.g., starts in Builder mode but mentions revenue or customers — upgrade naturally: "Okay, now we're talking — let me ask you some harder questions." Switch to Startup mode diagnostic.

If the conversation reveals the deliverable is content (e.g., the user says "I need to write a post about this" or "help me draft the announcement"), switch to Content mode and load `references/content-intake.md`.

If the user says "just do it" or expresses impatience:
- Say: "I hear you. Let me ask two more critical questions, then we'll move."
- Ask the 2 most critical remaining questions for their mode.
- If they push back a second time, respect it and proceed to alternatives.

If the conversation reveals the goal is larger or smaller than initially classified — e.g., a feature-sized goal turns out to need multiple independent specs, or a capability-sized goal turns out to be a single-file fix — reclassify scope and state the change: "This is actually roadmap-sized — let's decompose." Adjust question routing to match the new classification.
</MODE-DETECTION>

<HARD-GATE>

Do NOT create SPEC.md, DESIGN.md, or any implementation artifact until:
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

## Startup Mode: Six Forcing Questions

Ask these one at a time. Push until the answer names concrete evidence, a specific stakeholder, or an observable workaround. If the answer remains category-level after the allowed pushes, use the STOP conditions instead of continuing.

**Q1: Demand Reality** — "What's the strongest evidence that someone actually wants this — not 'is interested,' but would be genuinely upset if it disappeared tomorrow?"

Push until you hear: specific behavior, someone paying, someone building their workflow around it.

Red flags: "People say it's interesting." "We got 500 waitlist signups." Interest is not demand.

**Q2: Status Quo** — "What are your users doing right now to solve this problem — even badly? What does that workaround cost them?"

Push until you hear: a specific workflow, hours spent, tools duct-taped together.

Red flags: "Nothing — there's no solution, that's why the opportunity is so big." If truly nothing exists, the problem probably isn't painful enough.

**Q3: Desperate Specificity** — "Name the actual human who needs this most. What's their title? What gets them promoted? What gets them fired?"

Push until you hear: a name, a role, a specific consequence they face if the problem isn't solved.

Red flags: "Healthcare enterprises." "SMBs." "Marketing teams." You can't email a category.

**Q4: Narrowest Wedge** — "What's the smallest possible version of this that someone would pay real money for — this week, not after you build the platform?"

Push until you hear: one feature, one workflow, something shippable in days.

Red flags: "We need the full platform first." "Stripped down wouldn't be differentiated." These mean the founder is attached to architecture, not value.

Scope note: This question tests shippability instinct, not scope. Use the answer to understand what the user considers the core value, then return to their stated goal. Do not replace a capability-sized goal with the narrowest wedge answer.

**Q5: Observation & Surprise** — "Have you watched someone use this without helping them? What did they do that surprised you?"

Push until you hear: a specific surprise that contradicted the founder's assumptions.

Red flags: "We sent a survey." "Nothing surprising, it's going as expected." Surveys lie. "As expected" means filtered through assumptions.

**Q6: Future-Fit** — "If the world looks meaningfully different in 3 years, does your product become more essential or less?"

Push until you hear: a specific claim about why the product becomes more valuable as the world changes.

Red flags: "The market is growing 20% per year." Growth rate is not a vision. "AI will make everything better." That's not a product thesis.

Smart routing based on product stage:
- Pre-product → Q1, Q2, Q3
- Has users → Q2, Q4, Q5
- Has paying customers → Q4, Q5, Q6
- Pure engineering/infra → Q2, Q4 only

Smart routing based on scope classification:
- Bug-sized → Q2 only (status quo / workaround cost), then move to alternatives
- Feature-sized → standard routing by product stage
- Capability-sized → Q1, Q2, Q5 (demand, status quo, observation). Use Q4 as a calibration probe to understand the core value, not to set scope.
- Roadmap-sized → Q1, Q2, Q3, then help decompose into the first spec candidate

## Builder Mode: Design Partner

Ask these one at a time. The goal is to brainstorm and sharpen, not interrogate.

- **What's the coolest version of this?** What would make it genuinely delightful?
- **Who would you show this to?** What would make them say "whoa"?
- **What's the fastest path to something you can actually use or share?** Use the answer to understand what the user considers demonstrable progress, then return to their full goal. Do not redirect the conversation to the fast path if the user brought a larger vision.
- **What existing thing is closest to this, and how is yours different?**
- **What would you add if you had unlimited time?** What's the 10x version?

Operating principles:
1. Delight is the currency — what makes someone say "whoa"?
2. Ship something you can show people. The best version of anything is the one that exists.
3. The best side projects solve your own problem. Trust that instinct.
4. Explore before you optimize. Try the weird idea first. Polish later.

Smart routing based on scope classification:
- Bug-sized → Q3 (fastest path) + Q4 (how is yours different?), then move to alternatives
- Feature-sized → standard (all five questions)
- Capability-sized → Q1 (coolest version), Q4 (how is yours different?), Q5 (10x version)
- Roadmap-sized → Q1 (coolest version), Q2 (who would you show this to?), then decompose into the first spec candidate

## Output

If the user approves an approach, produce a design document (not SPEC.md) with:
- Scope classification (bug / feature / capability / roadmap)
- Objective statement
- Broader intent — the larger goal this spec serves, even if the spec only addresses part of it
- Target user or stakeholder
- Desired outcome
- Scope boundary and anti-goals
- Selected approach with rationale
- Key assumptions and risks
- Deferred scope — ideas surfaced during discussion that belong in `ROADMAP.md`, not this spec. Name them explicitly so they are captured, not lost.
- Recommended next skill: `auto-frame`

If the user does not approve an approach, output:
- Summary of what was discussed
- Why no approach was selected
- Deferred scope — any ideas worth preserving in `ROADMAP.md`
- Recommended next step (e.g., gather more evidence, talk to users, revisit in auto-office-hours)

## Rules

- **Conversational only until approval.** No code, no scaffolding, no file writes before the user picks an approach.
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

### Context Budget

Read `references/CONTEXT-BUDGET.md` for progressive loading rules and degradation tiers.
