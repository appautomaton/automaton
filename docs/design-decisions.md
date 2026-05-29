# Design Decisions

Rationale for choices where the why is not obvious from reading the code.

---

## DD-001: Central shared references and scripts

`_shared/references/` and `_shared/scripts/` are the package authoring sources. `installProject()` copies those references once into `.agent/.automaton/references/` and scripts once into `.agent/.automaton/scripts/`. Skill prompts read shared contracts and run shared scripts from those project-common paths. `_shared/` itself is never installed into host skill trees.

Shared scripts are self-contained but no longer copied into every skill folder.

**Why:** `.agent/` is the one common root across Claude, Codex, and OpenCode installs, so shared reference docs and scripts can live there without per-skill duplication.

**See:** `lib/install.mjs` (`installProject`, `installHost`, `syncHostSkills`).

---

## DD-002: current.json as the single state cursor

`current.json` is the only source for active change, stage, canonical artifact pointers, and review verdicts. Maintained prose summaries are intentionally not part of the lifecycle contract.

**Why:** JSON parsing is deterministic across LLM providers; markdown summaries drift and cost prompt tokens. State mutations go to JSON. Human-readable context comes from canonical artifacts (`INTAKE.md`, `SPEC.md`, `PLAN.md`, review sections, and roadmap items) or from generated command output.

**See:** `runtime/lib/state.mjs`, `runtime/lib/context.mjs`.

---

## DD-003: No nested skill invocation

**Why:** Prevents recursive context cascading. Each skill starts with `get-context.mjs`, a bounded entry point. Also host-agnostic: invocation mechanisms differ across Claude/Codex/OpenCode.

---

## DD-004: Prerequisites as data, not code

Stage prerequisites declared in `contracts-data.json`. Plan requires `canonicalSpec`; execute, verify, and verified require `canonicalPlan`.

**Why:** LLMs comply inconsistently with soft guidance under user pressure. Data-driven prerequisites are enforced by `validate.mjs` regardless of prompt.

**See:** `runtime/lib/contracts-data.json:13-18`.

---

## DD-005: Three-tier validation

L1 (state invariants) in runtime. L2 (artifact shape) in consuming skill. L3 (prose norms) in prompts and tests.

**Why:** Runtime must stay portable across three hosts. Only L1 can be enforced identically. L2 is context-dependent. L3 is subjective.

---

## DD-006: Session bootstrap via host startup integration, not skill

Host startup integration produces a short reminder before any skill runs.

**Why:** Instant orientation without invoking a skill or summarizing progress prose. The message identifies Automaton as an installed harness, points to `current.json` and the work-artifact tree, and reminds the agent that the user's latest request remains authoritative. Claude and Codex use SessionStart hooks; OpenCode uses its plugin event/chat hooks, including compaction handling.

---

## DD-007: get-context.mjs is self-contained

Every skill's first action runs `node .agent/.automaton/scripts/get-context.mjs`. This script duplicates normalization logic from `runtime/lib/state.mjs` instead of importing it.

**Why:** Shared skill scripts run from installed project runtime state where package source imports may not resolve. Self-containment keeps them usable across host surfaces and package/source layouts.

**See:** `skills/_shared/scripts/get-context.mjs:44` (comment).

---

## DD-008: Agent role ids are append-only; uninstall removes by exact name

The canonical list of Automaton subagent roles lives in `SUBAGENT_ROLES` (`lib/install.mjs`). A shipped id is never renamed or removed. New roles may only be appended. `uninstallHost()` removes each generated agent file by its exact role-derived name, not by an `automaton-*` namespace glob.

**Why:** Under append-only ids, every version's role list is a superset of every earlier version's, so a newer uninstaller names (and cleanly removes) every agent file an older install wrote; cross-version uninstall stays complete without scanning the namespace. Exact-name removal also leaves unrelated user-authored agents in `.<host>/agents/` untouched, whereas a namespace glob could delete a user file that happens to start with `automaton-`. Renames and removals (the one case exact-match cannot reconcile across version skew) are ruled out by the invariant rather than worked around in code.

**See:** `lib/install.mjs` (`SUBAGENT_ROLES`, `uninstallHost`), `tests/hosts.test.mjs` (append-only role-id guard).
