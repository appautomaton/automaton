# XML Conventions

Tags are attention spikes. Their value comes from scarcity — every additional tag dilutes the signal that makes the remaining ones work. Use standard markdown headers for structure. Reserve angle-bracket tags for the moments where the agent must halt, gate, or choose.

## Allowed Tags

Two tags. No more.

| Tag | Purpose | Shape |
|-----|---------|-------|
| `<GATE>` | Absolute prohibition | Starts with "Do NOT". Lists conditions. Includes an escape hatch. |
| `<STOP>` | Halt conditions | Lists exact conditions. Ends with the concrete recovery action (report, recommend a skill), or with "Do not guess. Do not proceed." when there is none. |

## Tag Syntax

Uppercase, separated by blank lines, no attributes, no nesting. Use the canonical name exactly.

```markdown
<GATE>

Do NOT proceed to auto-plan until:
- The user has approved the bounded goal
- Blocking questions are resolved or explicitly accepted

If the user asks to skip framing, reframe through auto-office-hours.
</GATE>
```

## Skill Tiers

Not every skill needs tags. Match tag density to the skill's decision surface.

| Tier | Tags | Examples |
|------|------|----------|
| Heavy | `<GATE>` + `<STOP>` | auto-execute, auto-office-hours |
| Medium | One tag, typically `<GATE>` or `<STOP>` | auto-frame, auto-plan, auto-onboard, auto-verify, auto-resume |
| Light | No tags. Blocking conditions live in Rules as "Do not guess." sentences. | auto-eng-review |

## Signal Scarcity

Tags work because they are rare. An LLM scanning 200 lines of markdown sees a `<GATE>` as a pattern break — the attention spike makes it harder to skip. Dilute with structural tags and the spike flattens.

Rules:
1. **One `<GATE>` per skill.** More than one dilutes the signal.
2. **One `<STOP>` per skill.** List all halt conditions together.
3. **No nested tags.** Each tag is a top-level boundary.
4. **No attributes.** `<GATE>` not `<GATE condition="...">`.
5. **Standard headers for structure.** `### Slice Template`, not `<SLICE-DESIGN>`.
6. **Canonical names only.** Use `<STOP>` for halt conditions; put the reason in the body, not the tag name.

## Gate Taxonomy

Every gate in a skill maps to one of these four types.

| Type | Purpose | Behavior | Recovery |
|------|---------|----------|----------|
| **Pre-flight** | Validate preconditions before starting | Block entry if unmet. No partial work created. | Fix precondition, retry. |
| **Revision** | Evaluate output quality after production | Loop back to producer with specific feedback. Bounded by iteration cap. | Producer addresses feedback; checker re-evaluates. |
| **Escalation** | Surface unresolvable issues | Pause workflow, present options, wait for human input. | Developer chooses action; workflow resumes. |
| **Abort** | Prevent damage or waste | Stop immediately, preserve state, report reason. | Investigate root cause, restart from checkpoint. |

**Selection heuristic:** Start with pre-flight. After work is produced → revision. Revision loop exhausted → escalate. Continuing is dangerous → abort.

## Checkpoint Types

The checkpoint vocabulary (`human-verify`, `decision`, `human-action`) is defined once in `_shared/references/ARTIFACT-LIFECYCLE.md` (Checkpoint Semantics). Do not restate the definitions here or in any skill.

Golden rule: **If the agent can run it, the agent runs it.** The user only does what requires human judgment.
