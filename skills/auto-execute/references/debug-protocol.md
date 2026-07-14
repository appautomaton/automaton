# Debug Protocol

Structure for a bounded diagnosis when the fix is not obvious. Shrink the search space with evidence instead of guessing harder: bisect the failing space, minimize the reproduction, contrast with a working sibling, and log at the boundaries you suspect.

## Escalation

Escalate if you cannot isolate the root cause within 3 attempts: three failed hypotheses mean the mental model is wrong, and further attempts only spend budget confirming that. Report:

```
**Observed:** [what the system does]
**Expected:** [what the system should do]
**Tried:** [what you investigated]
**Need:** [what you need from the user to proceed]
```
