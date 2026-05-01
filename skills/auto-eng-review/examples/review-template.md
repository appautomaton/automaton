# Engineering Review Template

Use this template when appending a `## Review: Engineering` section to `PLAN.md`.

```markdown
## Review: Engineering
- Verdict: approved_with_risks
- Strength: Minimal surface area; rollback via install manifest
- Concern: Hook scripts are generated strings; debugging is hard
- Action: Add structured logging before shipping
- Verified: Rollback path exists; missing edge-case tests
```

## Verdict Vocabulary

| Verdict | Meaning | Next Action |
|---------|---------|-------------|
| `approved` | Plan is safe, verifiable, and well-bounded | Proceed to `auto-execute` |
| `approved_with_risks` | Executable, but known risks need mitigation | Proceed to `auto-execute` with caution |
| `needs_correction` | Critical flaw or missing verification blocks execution | Return to `auto-plan` with corrections |

## Rules

- One review per plan. Update in place rather than appending duplicates.
- Preserve existing review sections when refreshing `PLAN.md`.
- The review section must appear after the main plan content.
- Focus on execution safety, not product vision.
