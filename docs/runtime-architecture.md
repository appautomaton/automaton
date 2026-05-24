# Runtime Architecture

Automaton's JS is three independent script groups with different callers and zero cross-imports.

## Three Groups

```
Caller          →  Code                  →  Installed at
────────────────────────────────────────────────────────
Host hooks      →  Runtime lib           →  .agent/.automaton/lib/
LLM (via bash)  →  Shared skill scripts  →  .agent/.automaton/scripts/
Developer       →  CLI                   →  npx @appautomaton/automaton
```

### Runtime lib (`.agent/.automaton/lib/`)

Module graph — files import each other. Called by hooks, not by skills.

| File | Purpose |
|------|---------|
| `context.mjs` | `buildSessionContext()` — reads current.json and outputs the cross-host harness reminder |
| `state.mjs` | `loadCurrentState()` / `saveCurrentState()` — snake↔camel normalization |
| `status.mjs` | STATUS.md prose-summary read/write |
| `contracts.mjs` | Loads `contracts-data.json` — stages, prerequisites, review verdicts |
| `contracts-data.json` | Pure data — the system's schema definition |
| `validate.mjs` | `validateHandoff()` — L1 checks (stage valid? pointer resolves?) |

### Shared skill scripts (`.agent/.automaton/scripts/`)

Self-contained — no runtime imports (see DD-007). Called by LLM via bash.

| File | Purpose |
|------|---------|
| `get-context.mjs` | Reads current.json, outputs normalized JSON + diagnostics |
| `sync-status.mjs` | Ensures STATUS.md has the compact prose-summary shape |

## Install Flow

`automaton install --claude .` does two things:

```
installProject()                    installHost(claude)
├─ scaffold .agent/ tree            ├─ copy skills/ → .claude/skills/
├─ sync runtime/ → .automaton/      │    (skip _shared/ directory)
├─ sync shared refs → .automaton/references/
├─ sync shared scripts → .automaton/scripts/
└─ seed current.json                ├─ generate HOST-TOOLS.md per skill
                                    ├─ wire hooks in .claude/settings.json
                                    └─ record in install-manifest.json
```

Manifest tracks every installed file for exact `--uninstall` cleanup.

## Skill ↔ Script Interaction

```
Session start
  └─ Hook → buildSessionContext() → short cross-host Automaton reminder

User invokes /auto-frame
  └─ LLM reads SKILL.md
  └─ Step 1: node .agent/.automaton/scripts/get-context.mjs → JSON state + diagnostics
  └─ LLM works (reads files, writes SPEC.md, etc.)
  └─ Last step: node .agent/.automaton/scripts/sync-status.mjs → ensures STATUS.md shape
  └─ Output: "Recommended next: auto-ceo-review"
```
