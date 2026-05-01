# XML Conventions

Syntax conventions for behavioral boundaries within skills. Use standard markdown headers (`## Preamble`, `## Do`, `## Output`, `## Rules`) for structure. Reserve angle-bracket tags for critical decision points where the agent must halt, gate, or choose.

## When to Use XML Tags

Use tags only for behavioral boundaries. Do not tag structural sections.

| Use tag | Do not tag |
|---------|-----------|
| `<HARD-GATE>` — absolute block | `## Preamble` — structural |
| `<STOP>` — halt conditions | `## Do` — structural |
| `<INTERVIEW>` — structured questioning | `## Output` — structural |
| `<MODE-DETECTION>` — mode selection | `## Rules` — structural |
| `<REVIEW-TEMPLATE>` — exact output format | `## Deep` — structural |

## Tag Syntax

Uppercase, separated by blank lines, no attributes, no nested tag blocks. Use the canonical tag name exactly: `<STOP>`, not variants such as `<STOP-CONDITIONS>`.

```markdown
## Do

1. Load SPEC.md
2. Ask clarifying questions

<HARD-GATE>

Do NOT proceed to auto-plan until the user approves the bounded goal.

3. Create SPEC.md
```

## HARD-GATE

Place at the critical decision point — typically between framing and planning, or planning and execution.

```markdown
<HARD-GATE>

Do NOT proceed to auto-plan until:
- The user has approved the bounded goal
- Blocking questions are resolved or explicitly accepted
- canonical_spec points to a valid SPEC.md

If the user asks to skip framing and "just start coding," reframe through auto-office-hours.
```

**Rules:**
- Start with "Do NOT" — absolute prohibition.
- List conditions as a checklist.
- Include an escape hatch for bypass attempts.

## STOP

Place in execution skills where the agent must halt rather than guess.

```markdown
<STOP>

Halt immediately and report to the user when:
- A dependency is missing and cannot be installed
- A test fails repeatedly (> 3 attempts) with the same error
- An instruction in the plan is ambiguous or contradictory
- The approved slice no longer matches the codebase state

Do not guess. Do not proceed.
```

**Rules:**
- List exact conditions, not vague warnings.
- End with "Do not guess. Do not proceed."

## INTERVIEW

Use for structured user questioning in ideation and framing skills.

```markdown
<INTERVIEW>

Ask ≤ 6 questions, one per message. Prefer multiple-choice when possible.

1. **Scope:** "Is this one independent feature or multiple subsystems?"
2. **Constraint:** "What is the hard deadline or immovable constraint?"
3. **Success:** "What does 'done' look like for this change?"
```

**Rules:**
- State the maximum number of questions upfront.
- Group questions by theme.
- One question per message.

## MODE-DETECTION

Use when a skill has multiple operational modes.

```markdown
<MODE-DETECTION>

Detect mode from the user's language:

**Startup mode** — user mentions customers, revenue, funding, market, or competition.
→ Apply six forcing questions (demand reality, status quo, desperate specificity, narrowest wedge, observation, future-fit).

**Builder mode** — user mentions side project, hackathon, learning, open source, or personal use.
→ Apply design-thinking brainstorm (purpose, constraints, 2-3 approaches, recommendation).

**If the vibe shifts mid-session** — user starts in Builder mode but mentions revenue:
→ Say: "Okay, now we're talking — let me ask you some harder questions." Switch to Startup mode.
```

## REVIEW-TEMPLATE

Use to enforce consistent review output format.

```markdown
<REVIEW-TEMPLATE>

Append exactly this format to the artifact:

## Review: <Lens>
- Verdict: <approved|approved_with_risks|needs_clarification|needs_correction|descoped>
- Strength: <one sentence>
- Concern: <one sentence>
- Action: <one sentence>
- De-scoped: <comma-separated list or "none">
```

## Gate Taxonomy

Use this vocabulary when designing or describing validation checkpoints. Every gate in a skill maps to one of these four types.

| Type | Purpose | Behavior | Recovery |
|------|---------|----------|----------|
| **Pre-flight** | Validate preconditions before starting | Block entry if unmet. No partial work created. | Fix precondition, retry. |
| **Revision** | Evaluate output quality after production | Loop back to producer with specific feedback. Bounded by iteration cap. | Producer addresses feedback; checker re-evaluates. |
| **Escalation** | Surface unresolvable issues | Pause workflow, present options, wait for human input. | Developer chooses action; workflow resumes. |
| **Abort** | Prevent damage or waste | Stop immediately, preserve state, report reason. | Investigate root cause, restart from checkpoint. |

**Selection heuristic:** Start with pre-flight. After work is produced → revision. Revision loop exhausted → escalate. Continuing is dangerous → abort.

## Checkpoint Types

When a skill requires human interaction, use one of these three checkpoint types:

| Type | Frequency | Use for |
|------|-----------|---------|
| `human-verify` | 90% | Claude completed work, human confirms it works (UI, flows, functional) |
| `decision` | 9% | Human must choose implementation direction (tech, architecture, design) |
| `human-action` | 1% | No CLI/API exists OR auth gate hit (email verification, 2FA, OAuth) |

Golden rule: **If the agent can run it, the agent runs it.** The user only does what requires human judgment.

## Token Efficiency Rules

1. **One HARD-GATE per skill.** More than one dilutes the signal.
2. **One STOP section per skill.** List all halt conditions together.
3. **No nested tags.** Each tag is a top-level boundary.
4. **No attributes.** `<HARD-GATE>` not `<HARD-GATE condition="...">`.
5. **Standard headers for structure.** Do not invent tags for `## Preamble` or `## Do`.
6. **Canonical tag names only.** Use `<STOP>` for halt conditions; put the reason in the body text, not in the tag name.
