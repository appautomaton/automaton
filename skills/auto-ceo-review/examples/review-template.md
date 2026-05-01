# Product Review Template

Use this template when appending a `## Review: Product` section to `SPEC.md`.

```markdown
## Review: Product
- Verdict: approved_with_risks
- Strength: Unifies context across hosts without adding dependencies
- Concern: Scope is broad; host edge cases not enumerated
- Action: Proceed with single-host pilot before generalizing
- De-scoped: Multi-workspace sync, external registry
```

## Verdict Vocabulary

| Verdict | Meaning | Next Action |
|---------|---------|-------------|
| `approved` | Direction is clear, valuable, and well-scoped | Proceed to `auto-plan` |
| `approved_with_risks` | Worth pursuing, but known concerns need attention | Proceed to `auto-plan` with caution |
| `descoped` | Core idea is valid but current scope is too broad | Return to `auto-frame` with tighter scope |
| `needs_clarification` | Critical ambiguity blocks evaluation | Return to `auto-frame` or `auto-office-hours` |

## Rules

- One review per spec. Update in place rather than appending duplicates.
- Preserve existing review sections when refreshing `SPEC.md`.
- The review section must appear after the main spec content.
