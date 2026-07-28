# Resume Quality

Load this reference only before producing the recovery summary or next-action recommendation.

**The test:** if the summary would still sound valid after changing the active change name, it is too generic.

Failures that pass the test but still sink a recovery:

- Invented continuity: filling missing state from memory or likely intent.
- Narrative recap: the story of prior work instead of the current durable facts.
- Stale-pointer concealment: glossing over a canonical artifact that no longer resolves.
- Generic next step: recommending a skill without naming the blocker it resolves.

Before: "Significant progress has been made on the authentication overhaul — previously we'd been exploring various approaches, and the team has been working diligently on the implementation."

After: "Active change: auth-overhaul. Stage: execute. Slice 2 of 4 complete. Blocked: PLAN.md references deleted migration file."

Prose patterns: `.agent/.automaton/references/ANTI-SLOP.md`.
