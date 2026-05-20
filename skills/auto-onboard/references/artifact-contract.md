# Onboarding Artifact Contract

`auto-onboard` should create project truth in layers instead of collapsing everything into one monolithic note.

## Progressive Disclosure

1. `.agent/wiki/REPO-MAP.md`
   Import evidence, repo shape, live commands, and ambiguity.
2. `.agent/steering/PROJECT.md`
   Stable project identity. This answers why the repo exists and what it currently owns.
3. `.agent/steering/REQUIREMENTS.md`
   Durable commitments. This captures what must stay true, what the repo already constrains, and what is explicitly out of scope.
4. `.agent/steering/ROADMAP.md`
   Ordered next phases. This turns imported truth into a near-term sequence of work.
5. `.agent/steering/STATUS.md`
   Current bootstrap pointer and next action. This stays short and operational.

The sequence should read like `why -> what must stay true -> what to do next`.

## Writing Standard

- Remove scaffold prompts instead of preserving them.
- Lead with the conclusion, then support it with evidence.
- Prefer short sections with strong headings over long prose.
- Prefer tables and compact lists when the source material is scan-heavy.
- Separate `Observed`, `Inferred`, and `Needs Confirmation` when certainty differs.
- When a user follow-up is needed, ask a bounded decision question instead of outsourcing discovery.
- Keep roadmap items evidence-backed and near-term. Do not invent distant strategy.
- Name concrete files, packages, and commands whenever they anchor the truth.
- Do not let one artifact duplicate the full content of another. Each artifact should narrow the surface area.

## Confidence Model

- `Observed`: directly supported by files, commands, or repo structure that were read.
- `Inferred`: likely true from the evidence, but not stated directly.
- `Needs Confirmation`: materially important, but not yet safe to promote to project truth.

## Artifact Expectations

### `REPO-MAP.md`

- capture what was read and why it matters
- explain the repo shape in one pass
- preserve sources, commands, and unresolved ambiguity
- make it easy for later skills to avoid re-scanning the whole repo

### `PROJECT.md`

- why the repo exists
- who or what it serves
- primary runtime surfaces
- stack and key commands
- visible decision principles already encoded in the repo

### `REQUIREMENTS.md`

- accepted product and technical constraints
- invariants already encoded in the repo
- quality and operational expectations that later plans must respect
- non-goals that the current system clearly rejects
- unknowns that still need confirmation

### `ROADMAP.md`

- 3 to 6 ordered phases when repo evidence supports multiple independent phases; leave the scaffold placeholder otherwise
- each phase must include `status: pending` and an empty `change:` field; see `references/ROADMAP-CONTRACT.md` for the full format
- each phase should have an objective, why now, likely outputs, and an exit signal
- phases should reflect the current repo, not generic best practices
- phases should be sequenced so later skills can turn them into specific changes

### `STATUS.md`

- set `bootstrap` and the current stage unless a more specific active change already exists
- summarize what is now true after onboarding
- point to one concrete next skill
- stay operational, not essay-like
- do not duplicate canonical artifact paths from `current.json`, `SPEC.md`, or `PLAN.md`; name artifact roles instead

## Work Artifact Integrity

Work artifacts under `.agent/work/<change>/` may carry review annotations. These sections are append-only and must survive refreshes.

- Any heading matching `## Review: <Type>` in `SPEC.md`, `PLAN.md`, or `DESIGN.md` is a durable annotation.
- Controllers that refresh a work artifact must preserve existing `## Review:` sections and place them after the main content.
- A review section may be updated in place (e.g., a later review revises the verdict), but it must not be silently dropped.
- Only the user may request consolidation or removal of a review section.

This rule ensures that `auto-ceo-review`, `auto-eng-review`, and any future review gates remain discoverable by `auto-resume` and downstream controllers.

## Failure Mode to Avoid

Do not write elegant fiction. If the repo does not prove something, mark it as inferred or unknown.
