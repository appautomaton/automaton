# Token Economy

How the site's instruction-token comparison is measured, and how to re-run it. The site (`site/index.html`, section 04) charts instruction tokens a model holds to complete one typical unit of work across harnesses. This note is the method the caption references.

## Unit of work

One stage working set: the files a model holds when it runs one stage of one change. A working set is `FRAMEWORK.md` (read once per session) plus the stage's `SKILL.md` plus the shared references the skill's own prose pulls on its common path. Conditional pulls (quality cards, diagnostics, recovery tables) are excluded because they load only when triggered. This is the same definition the census enforces in `tests/context-census.test.mjs`, so the site's number and the CI guard cannot drift apart.

## Counting

Words are whitespace splits of the file, exactly as the census counts. Tokens are 1.3 per word, the ratio the census ceiling comments use for English prose mixed with markdown.

## Current numbers (2026-07-31, post-DD-024 main)

| Working set | Words | Tokens |
| --- | --- | --- |
| frame common path | 2,269 | ~2.9k |
| plan | 3,730 | ~4.8k |
| execute direct route | 4,776 | ~6.2k |
| execute subagent route | 6,078 | ~7.9k |
| verify | 3,412 | ~4.4k |

Mean 5.3k, median 4.8k, range midpoint 5.4k. The site shows ~5k.

DD-024 is the first pass that moved every working set at once, because it is the first that sorted candidates by leverage instead of by file size. A word in `FRAMEWORK.md` is paid in all five sets and a word in `ARTIFACT-LIFECYCLE.md` in four, so the 109 words those two files shed are worth 416 across the table. The lesson generalizes: a 400-word cut in a conditional reference moves nothing here, and a 40-word cut in `FRAMEWORK.md` moves everything.

DD-023 moved frame from 2,239 to 2,336 for the Check Engagement step (2,269 after DD-024's shared-reference trims), and changed what a working set means for the first time since the definition was written. A working set is now a conditional cost. Before DD-023 the session hook told every session to read `FRAMEWORK.md` at startup, so its 902 words were paid whether or not a stage ran. The hook now defers that read to the first stage action, which is exactly when the rest of the working set is paid anyway. The numbers above are unchanged in what they measure and now describe a session that actually enters a stage. A session that does not enters nothing and pays nothing.

The session reminder itself is the new fixed cost: 41 words to 97. That is the whole toll for a gate that can decline frame's 1,434 words plus everything after them.

DD-022 deleted 1,350 words and four files from the shipped corpus, and only frame's working set moved (2,293 to 2,239, down 2.4%). That split is the expected result and worth stating plainly: most of the deletion targeted conditional references, and conditional references are excluded from a working set by definition. Every trim round since DD-016 has produced this shape. A change that moves these numbers has to touch an entry point or a shared reference, which is why frame's is the one that moved: its `## Output` section and mode enumeration are in the entry point itself.

The corpus total is the number that moved most: 23,275 words to 21,500 across DD-022's two passes. Pass 2 also took `auto-eng-review/SKILL.md` from 740 words to 653, which does not appear in the table because the optional review is not a working set. It is still the cheapest kind of saving there is: an entry point, paid whenever the review runs.

## Re-measuring

Recompute the working sets with the census's own file list and counting rule, update this table and the chart in the same commit, and date both. If a working set grew since the last measurement, the census failed first, and that failure was the conscious decision point this number exists to force.

## The comparison bars

Superpowers ~7k, Trellis ~9k, GSD ~25k, gstack ~28k: in-house measurements of each harness's default workflow from July 2026, midpoints, not re-run since. Treat them as dated, not as wrong.

## What the July 2026 trim did and did not change

DD-016 and DD-017 cut the shipped corpus from 27,994 to 24,162 words and the skill count from 8 to 6. The runtime number barely moved, because what was deleted never loaded at runtime: onboarding ran once per project, the wiki and descriptive steering were install-time files, and `LEARNINGS.md` was never written in twelve changes. The trim's savings live in install weight and maintenance surface, not in the working sets. The one runtime change is in framing: a change that needed a diagnostic used to pay for office-hours plus frame (4,359 words across two skills) and now pays for one skill (2,254), while the shallow path pays +181 words for the depth choice (DD-017).
