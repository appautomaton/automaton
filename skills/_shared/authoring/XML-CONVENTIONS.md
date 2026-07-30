# XML Conventions

Tags are attention spikes. Their value comes from scarcity: every additional tag dilutes the signal that makes the remaining ones work. Use standard markdown headers for structure. Reserve angle-bracket tags for the moments where the agent must halt, gate, or choose.

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

If the user asks to skip framing, write the smallest useful SPEC and ask them to confirm it.
</GATE>
```

## Skill Tiers

Not every skill needs tags. Match tag density to the skill's decision surface.

| Tier | Tags | Skills |
|------|------|--------|
| Heavy | `<GATE>` + `<STOP>` | auto-execute, auto-frame |
| Medium | One tag, `<GATE>` or `<STOP>` | auto-plan, auto-verify, auto-resume, auto-eng-review |

A skill needing no tag at all is allowed. Its blocking conditions live in Rules as "Do not guess." sentences.

## Signal Scarcity

Tags work because they are rare. An LLM scanning 200 lines of markdown sees a `<GATE>` as a pattern break, and the attention spike makes it harder to skip. Dilute with structural tags and the spike flattens.

Rules:
1. **One `<GATE>` per skill.** More than one dilutes the signal.
2. **One `<STOP>` per skill.** List all halt conditions together.
3. **No nested tags.** Each tag is a top-level boundary.
4. **No attributes.** `<GATE>` not `<GATE condition="...">`.
5. **Standard headers for structure.** `### Slice Template`, not `<SLICE-DESIGN>`.
6. **Canonical names only.** Use `<STOP>` for halt conditions; put the reason in the body, not the tag name.

## Gate Placement

What each tag means, and where it belongs, is defined once in `_shared/references/FRAMEWORK.md` (GATE and STOP Tags). Do not restate the definitions here.

The authoring rule that follows from them: a `<GATE>` sits immediately before the artifact write or state mutation it protects, so the conditions are read at the moment they apply. A `<STOP>` sits at the end of the procedure, listing every halt condition together, because a halt can fire from anywhere inside it.

Review loops are not gates. A bounded revision loop belongs to `SUBAGENT-PROTOCOL.md`, which owns the reviewer statuses and the loop limits.

## Checkpoint Types

The checkpoint vocabulary (`human-verify`, `decision`, `human-action`) is defined once in `_shared/references/ARTIFACT-LIFECYCLE.md` (Checkpoint Semantics). Do not restate the definitions here or in any skill.

Golden rule: **If the agent can run it, the agent runs it.** The user only does what requires human judgment.
