# Runtime Architecture

Automaton's JS is three independent script groups with different callers and zero cross-imports.

## Three Groups

```
Caller          →  Code                  →  Installed at
────────────────────────────────────────────────────────
Host hooks      →  Runtime lib + bin     →  .agent/.automaton/
LLM (via bash)  →  Skill scripts         →  .claude/skills/auto-*/scripts/
Developer       →  CLI                   →  npx @appautomaton/automaton
```

### Runtime lib (`.agent/.automaton/lib/`)

Module graph — files import each other. Called by hooks, not by skills.

| File | Purpose |
|------|---------|
| `context.mjs` | `buildSessionContext()` — reads current.json + STATUS.md, outputs ~100 tok |
| `state.mjs` | `loadCurrentState()` / `saveCurrentState()` — snake↔camel normalization |
| `status.mjs` | STATUS.md read/write + pointer sync |
| `contracts.mjs` | Loads `contracts-data.json` — stages, prerequisites, review verdicts |
| `contracts-data.json` | Pure data — the system's schema definition |
| `validate.mjs` | `validateHandoff()` — L1 checks (stage valid? pointer resolves?) |

### Runtime bin (`.agent/.automaton/bin/`)

Standalone scripts. Called by hooks or directly.

| File | Purpose | Caller |
|------|---------|--------|
| `sync-status-pointer.mjs` | Lightweight: syncs change+stage to STATUS.md frontmatter | Stop hook |
| `sync-status.mjs` | Full: current.json → STATUS.md (progress, next step, risks) | Skill scripts |
| `update-state.mjs` | Writes activeChange + stage to current.json only | Direct |

### Skill scripts (`.claude/skills/auto-*/scripts/`)

Self-contained — no runtime imports (see DD-007). Called by LLM via bash.

| File | Purpose |
|------|---------|
| `get-context.mjs` | Reads current.json, outputs normalized JSON + diagnostics |
| `sync-status.mjs` | Updates current.json + STATUS.md |
| `scaffold-agent.mjs` | Creates .agent/ directory structure + initial steering files |

## Install Flow

`automaton install --claude .` does two things:

```
installProject()                    installHost(claude)
├─ scaffold .agent/ tree            ├─ copy skills/ → .claude/skills/
├─ sync runtime/ → .automaton/      │    (skip _shared/ directory)
└─ seed current.json                ├─ inject _shared/refs + scripts per skill
                                    ├─ generate HOST-TOOLS.md per skill
                                    ├─ wire hooks in .claude/settings.json
                                    └─ record in install-manifest.json
```

Manifest tracks every installed file for exact `--uninstall` cleanup.

## Skill ↔ Script Interaction

```
Session start
  └─ Hook → buildSessionContext() → ~100 tok injected

User invokes /auto-frame
  └─ LLM reads SKILL.md
  └─ Step 1: node scripts/get-context.mjs → JSON state + diagnostics
  └─ LLM works (reads files, writes SPEC.md, etc.)
  └─ Last step: node scripts/sync-status.mjs → updates state
  └─ Output: "Recommended next: auto-ceo-review"

Session ends
  └─ Hook → syncStatusPointerFromCurrentState() → STATUS.md aligned
```
