---
name: auto-onboard
description: Build project truth from repo evidence. Use when steering is missing or stale.
metadata:
  stage: frame
---

# auto-onboard

Repository discovery. Builds bounded project truth from evidence, not guessing.

First action: run `scripts/get-context.mjs` → JSON `{activeChange, stage, canonicalSpec, canonicalDesign, canonicalPlan, productReview, engineeringReview, diagnostics}` (missing state normalizes to `"none"`/`null`). If any diagnostic has level `"error"`, stop and report it before proceeding.

## Preamble

auto-onboard builds bounded project truth from repository evidence, not training data, not conversation, not guessing. It writes five steering artifacts and never writes code. Context budget: REPO-MAP.md under 150 lines; stop scanning once you have enough.

## Quality Gate

Before writing steering artifacts:
- Separate observed, inferred, and unknown facts.
- Cite paths for repo-shape claims.
- Stop scanning once the next action is clear.
- Read `references/quality.md` (~36 lines: anti-patterns, better shape, prose hygiene scan patterns) when artifacts turn into broad inventory.

## Do

### Detect State

Three cases:
1. **First-time or scaffold-level.** `get-context.mjs` returned no state or steering files are scaffold placeholders (e.g., `"..."` or template prompts). Proceed to scan.
2. **Already-onboarded, no update requested.** `.agent/steering/PROJECT.md` contains real project truth and the user did not ask for a refresh. Report what exists and route by state:
     - Active change with a stage → `auto-resume`
     - No active change or stage is `none` → `auto-office-hours`
3. **Already-onboarded, targeted refresh.** Steering exists and the user asks to update it (e.g., "update REQUIREMENTS because we added Postgres"). Focus on the evidence relevant to the update, update only the affected steering file(s), run `sync-status.mjs`, and report what changed. Read additional files when needed to produce an accurate update.

When writing ROADMAP.md during first-time setup, use the format in `references/ROADMAP-CONTRACT.md` (~63 lines: canonical phase format, status values, update rules by skill, matching rule, single-file invariant).

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

### Write Artifacts

Use `templates/` as scaffolds:
- `.agent/wiki/REPO-MAP.md`: bounded import record
- `.agent/steering/PROJECT.md`: what this repo owns and why
- `.agent/steering/REQUIREMENTS.md`: observed, inferred, and unknown constraints
- `.agent/steering/ROADMAP.md`: 3 to 6 plausible phases when repo evidence supports multiple independent phases; otherwise leave the scaffold placeholder for `auto-office-hours` to fill on demand
- `.agent/steering/STATUS.md`: current state and next step

### Update State

Run `sync-status.mjs` from this skill's installed directory to align `.agent/steering/STATUS.md` with `.agent/.automaton/state/current.json`.

### Report

Summarize what you found, what you wrote, and what remains uncertain.

<HARD-GATE>

Do NOT proceed past scanning if:
- The repository has no `README.md`, no `package.json` equivalent, and no recognizable directory structure after reading 10 files.
- The user has not confirmed whether to overwrite existing steering artifacts.

If the repo is empty or unrecognizable, report this and stop.
</HARD-GATE>

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
| ROADMAP.md | `.agent/steering/` | 3–6 phases when evidence supports them; scaffold placeholder otherwise |
| STATUS.md | `.agent/steering/` | Current state, what is true now, next step |

- `.agent/.automaton/state/current.json` initialized when missing; auto-onboard does not overwrite an existing `active_change` or `stage`
- Diagnostic handling: `error`-level diagnostics (missing primary project, conflicting conventions) halt the onboard; `warning`-level findings appear in the steering artifacts
- Recommended next skill: `auto-office-hours` (when scale or shape is undefined) or `auto-frame` (when the user already has a bounded goal). The user or host invokes the next skill; auto-onboard does not require nested invocation.

## Rules

- **Bounded scan.** Read no more than 10 files total. Summarize, do not transcribe.
- **Evidence anchors.** Every claim in steering artifacts must cite a file path.
- **Progressive loading.** README → config → 1 source file per surface → stop.
- **No-re-read.** If you read a file once, do not read it again in this session.

## Deep

### Scan Protocol

Read `references/topology-scan.md` for runtime surfaces, package boundaries, stack conventions. (~56 lines: 7-layer read order from existing Automaton state through delivery surfaces, budget rules, REPO-MAP.md output requirements.)

### Artifact Contract

Read `references/artifact-contract.md` for exact format and required sections. (~92 lines: progressive disclosure structure for 5 artifacts, writing standard, confidence model with Observed/Inferred/Needs Confirmation, per-artifact expectations and required sections.)

### Question Patterns

Read `references/question-patterns.md` for good and bad follow-up questions. (~39 lines: 4 good patterns with evidence→assumption→decision structure, 3 bad open-ended anti-patterns, escalation rule.)
