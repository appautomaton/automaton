# Slice Design Examples

## Well-Designed Slice

```markdown
### Slice 3: Implement user authentication middleware

**Objective:** Add JWT validation to all protected API routes.
**Context budget:** ~12% of context window.
**Produces:** `src/middleware/auth.js` with `verifyToken` function, plus updated route handlers.
**Verification:** `npm test -- auth.middleware.test.js` passes; `curl -H "Authorization: Bearer invalid" /api/protected` returns 401.
```

Why this works:
- Objective is specific and testable.
- Context budget is explicit.
- Produces a specific artifact.
- Verification is a concrete command with expected output.

## Poorly-Designed Slice

```markdown
### Slice 3: Add auth

**Objective:** Make the API secure.
**Context budget:** ~20% of context window.
**Produces:** Working authentication.
**Verification:** Tests pass.
```

Why this fails:
- "Make the API secure" is not actionable.
- No specific artifact named.
- "Tests pass" is not a specific command.
- Context budget is too high for the vagueness.

## Another Good Example

```markdown
### Slice 2: Add database migration for user preferences

**Objective:** Create migration that adds `preferences` JSONB column to `users` table.
**Context budget:** ~8% of context window.
**Produces:** `migrations/20240115_add_user_preferences.sql` plus rollback script.
**Verification:** `npm run db:migrate` succeeds; `npm run db:rollback` reverts cleanly; schema inspection confirms column exists.
```

## Another Bad Example

```markdown
### Slice 2: Database stuff

**Objective:** Update the database.
**Context budget:** ~15% of context window.
**Produces:** Database changes.
**Verification:** Check the database.
```

## Rule of Thumb

If you cannot write the verification command before starting the slice, the slice is not well-defined.
