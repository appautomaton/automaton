# Runtime Architecture

Automaton's JS is three independent script groups with different callers and zero cross-imports between groups.

## Three Groups

```
Caller          →  Code                  →  Installed at
────────────────────────────────────────────────────────
Host hooks/plugins → Runtime lib         →  .agent/.automaton/lib/
LLM (via bash)  →  Shared skill scripts  →  .agent/.automaton/scripts/
Developer       →  CLI                   →  npx @appautomaton/automaton
```

### Runtime lib (`.agent/.automaton/lib/`)

Module graph. Files import each other. Called by hooks/plugins, not by skills.

| File | Purpose |
|------|---------|
| `context.mjs` | `buildSessionContext()` -> reads current.json and outputs the cross-host harness reminder |
| `state.mjs` | `loadCurrentState()` / `saveCurrentState()` -> snake↔camel normalization |
| `contracts.mjs` | Loads `contracts-data.json` -> stages, prerequisites, review verdicts |
| `contracts-data.json` | Pure data -> the system's schema definition |
| `validate.mjs` | `validateHandoff()` -> L1 checks (stage valid? pointer resolves?) |

### Shared skill scripts (`.agent/.automaton/scripts/`)

Self-contained. No runtime imports (see DD-007). Called by LLM via bash.

| File | Purpose |
|------|---------|
| `get-context.mjs` | Reads current.json, outputs normalized JSON + diagnostics (L1 errors, L2 artifact-shape lint warnings) |
| `sync-status.mjs` | Validates and updates current.json with state flags; surfaces the same L2 lint warnings at write time |

## Install Flow

`automaton install --claude .` does two things:

```
installProject()                    installHost(claude)
├─ scaffold .agent/ tree            ├─ replace the 9 skill dirs → .claude/skills/
├─ replace runtime/ → .agent/.automaton/ │  (skip _shared/ and per-skill scripts)
├─ replace shared refs → .agent/.automaton/references/
├─ replace shared scripts → .agent/.automaton/scripts/
└─ seed current.json if missing     ├─ generate HOST-TOOLS.md in auto-execute
                                    ├─ replace generated hook/plugin implementations
                                    └─ merge host config when needed
```

Install ownership is deterministic by path: runtime/shared files, Automaton skill dirs, and generated hook/plugin implementations are refreshed from source; durable state and steering are seeded only when missing; host config files such as `.claude/settings.json`, `.codex/config.toml`, and `.codex/hooks.json` are created or merged.

Every install also writes a receipt to `.agent/.automaton/state/install-manifest.json`: per owner (`project` or a host id), the files written with content hashes, the directories created because they did not exist before, and the exact config fragments merged. Uninstall removes that recorded set (legacy installs without a receipt fall back to source recompute), and reinstall uses it to clean up orphans from older versions and to report locally modified installed copies. See `docs/design-decisions.md` DD-011.

## Skill ↔ Script Interaction

```
Session start
  └─ Hook → buildSessionContext() → short cross-host Automaton reminder

User invokes /auto-frame
  └─ LLM reads SKILL.md
  └─ Step 1: node .agent/.automaton/scripts/get-context.mjs → JSON state + diagnostics
  └─ LLM works (reads files, writes SPEC.md, etc.)
  └─ Last step: node .agent/.automaton/scripts/sync-status.mjs --canonical-spec ... --stage frame
       → validates/writes current.json
  └─ Output: "Recommended next: auto-plan" or "Optional review: auto-ceo-review"
```
