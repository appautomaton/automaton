# Debug Protocol

Structure for a bounded diagnosis when the fix is not obvious. The goal is to shrink the search space with evidence, not to guess harder.

## Investigation Techniques

1. **Bisection.** Split the failing space in half and test each half. Repeat until the trigger is isolated: one failure in a 100-test suite localizes in about seven runs.
2. **Minimal reproduction.** Remove code until the bug disappears. The last thing removed is the trigger.
3. **Contrast.** Find a similar test or function that works and compare line by line until the difference names the cause.
4. **Logging.** Add log lines at key points before reaching for a debugger. Logs are faster to place and their output is durable evidence.

## Escalation

Escalate if you cannot isolate the root cause within 3 attempts: three failed hypotheses mean the mental model is wrong, and further attempts only spend budget confirming that. Report:

```
**Observed:** [what the system does]
**Expected:** [what the system should do]
**Tried:** [what you investigated]
**Need:** [what you need from the user to proceed]
```

Example:

```
**Observed:** `npm test` fails with "Cannot find module '../config'" in 3 files.
**Expected:** Tests should resolve the config module.
**Tried:** Verified `src/config/index.js` exists. Verified `package.json` main field. Checked for typos in import paths.
**Need:** Is there a build step or alias configuration that resolves this path? I don't see it in the plan.
```
