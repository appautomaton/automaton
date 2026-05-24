---
name: auto-onboard
description: Build project truth from repo evidence. Use when steering is missing or stale.
metadata:
  stage: frame
---

# auto-onboard

Repository discovery. Builds bounded project truth from evidence, not guessing.

First action: run `node .agent/.automaton/scripts/get-context.mjs` from the project root → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding.

## Preamble

auto-onboard builds bounded project truth from repository evidence, not training data, not conversation, not guessing. It does not write code or produce specs. Loading discipline: keep REPO-MAP.md under 150 lines; stop scanning once you have enough.

## Quality Gate

Before writing steering artifacts:
- Separate observed, inferred, and unknown facts.
- Cite paths for repo-shape claims.
- Treat artifact writing as expensive: write only durable project truth and immediate blockers, not scratch notes.
- Stop scanning once the next action is clear.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when artifacts turn into broad inventory.

## Do

### Detect State

Three cases:
1. **First-time or scaffold-level.** `get-context.mjs` returned no state or steering files are scaffold placeholders (e.g., `"..."` or template prompts). Proceed to scan.
2. **Already-onboarded, no update requested.** `.agent/steering/PROJECT.md` contains real project truth and the user did not ask for a refresh. Report what exists and route by state:
     - Active change with a stage → `auto-resume`
     - No active change or stage is `none` → `auto-office-hours`
3. **Already-onboarded, targeted refresh.** Steering exists and the user asks to update it (e.g., "update REQUIREMENTS because we added Postgres"). Focus on the evidence relevant to the update, update only the affected steering file(s), run `node .agent/.automaton/scripts/sync-status.mjs`, and report what changed. Read additional files when needed to produce an accurate update.

When handling ROADMAP.md during first-time setup, always keep the short placeholder. Do not create roadmap phases on a first run. On refresher runs, write roadmap phases only when strong repo evidence shows an existing or ongoing roadmap and the user confirms importing or refreshing it in chat; then use `.agent/.automaton/references/ROADMAP-CONTRACT.md` (~63 lines: canonical phase format, status values, update rules by skill, matching rule, single-file invariant).

### Scan Top-Level Files

Read `README.md`, `package.json` or equivalent, and up to 3 config files (e.g., `.gitignore`, `tsconfig.json`, `Makefile`). Stop at 5 files.

### Map Topology

Read `references/topology-scan.md` (~56 lines: 7-layer read order, budget rules, REPO-MAP.md output requirements) for the scan protocol. Identify:
- Runtime surfaces (CLI, API, UI, worker)
- Package boundaries (apps, packages, modules)
- Stack (language, framework, build tool, test runner)
- Commands that work today (install, build, test, lint)

### Ask (if necessary)

If ambiguity affects the steering output, ask ≤ 3 questions. Read `references/question-patterns.md` (~39 lines: 4 good evidence→assumption→decision patterns, 3 anti-patterns) for how to ask. If the answer can be inferred from the repo with one more targeted read, do that instead.

For ROADMAP.md specifically: on first-time onboarding, do not ask and do not create phases. On refresher runs, if strong evidence of an ongoing roadmap exists but user confirmation is missing, ask whether to import/refresh it, leave the current roadmap alone, or route to `auto-office-hours` for a fresh decomposition. If there is no strong evidence, do not ask; keep the placeholder or existing roadmap unchanged.

### Write Artifacts

Use `templates/` as scaffolds:
- `.agent/wiki/REPO-MAP.md`: bounded evidence index; no open-question parking, confidence verdict, or recommended next skill
- `.agent/steering/PROJECT.md`: compact identity record; what this repo owns and why
- `.agent/steering/REQUIREMENTS.md`: durable constraints only; no generic unknown parking
- `.agent/steering/ROADMAP.md`: compact placeholder on first run; refresher-only phase updates when strong roadmap evidence exists and the user confirms in chat
- `.agent/steering/STATUS.md`: current state and next step

### Update State

Run `node .agent/.automaton/scripts/sync-status.mjs` from the project root.

### Report

Summarize what you found, what you wrote, and what remains uncertain.

<GATE>

Do NOT proceed past scanning if:
- The repository has no `README.md`, no `package.json` equivalent, and no recognizable directory structure after reading 10 files.
- The user has not confirmed whether to overwrite existing steering artifacts.

If the repo is empty or unrecognizable, report this and stop.
</GATE>

<STOP>

Halt and report when:
- A required file (`README.md`, root config) exists but cannot be parsed.
- The repository contains multiple projects at the same level and you cannot determine which is primary.
- The scan reveals conflicting conventions (e.g., both npm and poetry in the same root) and the user cannot clarify.

Do not guess. Do not proceed.
</STOP>

## Output

| Artifact | Location | Purpose |
|----------|----------|---------|
| REPO-MAP.md | `.agent/wiki/` | Bounded import record: surfaces, stack, boundaries, hotspots |
| PROJECT.md | `.agent/steering/` | What this repo owns, why it exists, major surfaces |
| REQUIREMENTS.md | `.agent/steering/` | Constraints, non-goals, risks, evidence anchors |
| ROADMAP.md | `.agent/steering/` | High-signal placeholder on first run; refresher-only phases after strong roadmap evidence and chat confirmation |
| STATUS.md | `.agent/steering/` | Current state, what is true now, next step |

- `.agent/.automaton/state/current.json` initialized when missing; auto-onboard does not overwrite an existing `active_change` or `stage`
- Diagnostic handling: `error`-level diagnostics block the onboard; `warning`-level findings surface to the steering artifacts
- Recommended next skill: `auto-office-hours` (when scale or shape is undefined) or `auto-frame` (when the user already has a bounded goal). The user or host invokes the next skill; auto-onboard does not chain.

## Rules

- **Bounded scan.** Read no more than 10 files total. Summarize, do not transcribe.
- **Evidence anchors.** Every claim in steering artifacts must cite a file path.
- **Artifact minimalism.** Do not write speculative questions, confidence labels, or routing chatter into durable artifacts.
- **Delete empty sections.** Templates are prompts, not required headings.
- **Progressive loading.** README → config → 1 source file per surface → stop.
- **No-re-read.** If you read a file once, do not read it again in this session.
- **Roadmap restraint.** Never create roadmap phases on first-time onboarding. On refresh, change roadmap phases only when both evidence and user confirmation justify it.

## Deep

### Scan Protocol

Read `references/topology-scan.md` for runtime surfaces, package boundaries, stack conventions. (~56 lines: 7-layer read order from existing Automaton state through delivery surfaces, budget rules, REPO-MAP.md output requirements.)

### Artifact Contract

Read `references/artifact-contract.md` for exact format and required sections. (~92 lines: progressive disclosure structure for 5 artifacts, writing standard, confidence model with Observed/Inferred/Needs Confirmation, per-artifact expectations and required sections.)

### Question Patterns

Read `references/question-patterns.md` for good and bad follow-up questions. (~39 lines: 4 good patterns with evidence→assumption→decision structure, 3 bad open-ended anti-patterns, escalation rule.)
