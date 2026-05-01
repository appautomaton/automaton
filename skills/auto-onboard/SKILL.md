---
name: auto-onboard
description: Discover a repository and produce bounded project truth. Use when .agent/ is missing, stale, or the user asks "what is this repo?" or "how do I work on this?"
compatibility: Portable across Claude Code, Codex, and OpenCode. Host-specific runtime hooks and plugins are installed separately by Automaton.
metadata:
  stage: frame
  role: controller
---

# auto-onboard

Discover a repository and produce bounded project truth. Use this skill when `.agent/` is missing, stale, or the user asks "what is this repo?" or "how do I work on this?"

First action: run `scripts/get-context.mjs` from this skill's installed directory to detect existing state. If `.agent/` is absent, also run `scripts/scaffold-agent.mjs` before scanning.

## Preamble

auto-onboard reads repository evidence and writes five steering artifacts into `.agent/steering/` and `.agent/wiki/`. It never writes code. It stops if the repository has no recognizable structure after reading 10 files. Context budget: produce a REPO-MAP.md under 150 lines; stop scanning once you have enough.

## Quality Gate

Before writing steering artifacts:
- Separate observed, inferred, and unknown facts.
- Cite paths for repo-shape claims.
- Stop scanning once the next action is clear.
- Read `references/quality.md` if artifacts start turning into broad inventory.

## Do

1. **Detect state.** If `get-context.mjs` returned `"activeChange": "bootstrap"` or the file is missing, proceed. If it returned an active change and stage, read `.agent/steering/STATUS.md` and ask the user whether to refresh or resume.

2. **Scaffold if needed.** If `.agent/` does not exist, run this skill's installed `scaffold-agent.mjs` from the same host skill root.

3. **Scan top-level files.** Read `README.md`, `package.json` or equivalent, and up to 3 config files (e.g., `.gitignore`, `tsconfig.json`, `Makefile`). Stop at 5 files.

4. **Map topology.** Read `references/topology-scan.md` for the scan protocol. Identify:
   - Runtime surfaces (CLI, API, UI, worker)
   - Package boundaries (apps, packages, modules)
   - Stack (language, framework, build tool, test runner)
   - Commands that work today (install, build, test, lint)

5. **Ask only if necessary.** If ambiguity affects the steering output, ask ≤ 3 questions. Read `references/question-patterns.md` for how to ask. If the answer can be inferred from the repo with one more targeted read, do that instead.

6. **Write artifacts.** Use `templates/` as scaffolds:
   - `.agent/wiki/REPO-MAP.md` — bounded import record
   - `.agent/steering/PROJECT.md` — what this repo owns and why
   - `.agent/steering/REQUIREMENTS.md` — observed, inferred, and unknown constraints
   - `.agent/steering/ROADMAP.md` — 3 to 6 plausible phases
   - `.agent/steering/STATUS.md` — current state and next step

7. **Update state.** Run this skill's installed `sync-status.mjs` from the same host skill root to align `STATUS.md` with `current.json`.

8. **Report.** Summarize what you found, what you wrote, and what remains uncertain.

<HARD-GATE>

Do NOT proceed past scanning if:
- The repository has no `README.md`, no `package.json` equivalent, and no recognizable directory structure after reading 10 files.
- The user has not confirmed whether to overwrite existing steering artifacts.

If the repo is empty or unrecognizable, report this and stop.

<STOP>

Halt and report when:
- A required file (`README.md`, root config) exists but cannot be parsed.
- The repository contains multiple projects at the same level and you cannot determine which is primary.
- The scan reveals conflicting conventions (e.g., both npm and poetry in the same root) and the user cannot clarify.

Do not guess. Do not proceed.

## Output

| Artifact | Location | Purpose |
|----------|----------|---------|
| REPO-MAP.md | `.agent/wiki/` | Bounded import record: surfaces, stack, boundaries, hotspots |
| PROJECT.md | `.agent/steering/` | What this repo owns, why it exists, major surfaces |
| REQUIREMENTS.md | `.agent/steering/` | Constraints, non-goals, risks, evidence anchors |
| ROADMAP.md | `.agent/steering/` | 3–6 phases sequenced by dependency and leverage |
| STATUS.md | `.agent/steering/` | Current state, what is true now, next step |

## Rules

- **No code changes.** This skill writes markdown only.
- **Bounded scan.** Read no more than 10 files total. Summarize, do not transcribe.
- **Evidence anchors.** Every claim in steering artifacts must cite a file path.
- **Progressive loading.** Read files in this order: README → config → 1 source file per surface → stop.
- **No-re-read.** If you read a file once, do not read it again in this session.

## Deep

### Scan Protocol

Read `references/topology-scan.md` for detailed scanning rules: how to detect runtime surfaces, how to map package boundaries, and how to identify stack conventions.

### Artifact Contract

Read `references/artifact-contract.md` for the exact format and required sections of each steering artifact.

### Question Patterns

Read `references/question-patterns.md` for examples of good and bad follow-up questions.

### Context Budget

Read `references/CONTEXT-BUDGET.md` for progressive loading rules and degradation tiers.
