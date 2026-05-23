# Design Decisions

Rationale for choices where the why is not obvious from reading the code.

---

## DD-001: Central shared references, copied skill scripts

`_shared/references/` is the package authoring source. `installProject()` copies those references once into `.agent/.automaton/references/`, and skill prompts read shared contracts from that project-common path. `_shared/` itself is never installed into host skill trees.

Shared scripts still copy into every skill `scripts/` directory because the LLM runs them relative to the active skill folder and they stay self-contained after install.

**Why:** `.agent/` is the one common root across Claude, Codex, and OpenCode installs, so shared reference docs can live there without per-skill duplication. Scripts keep the old per-skill copy model because runtime module paths differ by host skill root.

**See:** `lib/install.mjs` (`installProject`, `installHost`, `removeManifestOwnedSharedReferences`).

---

## DD-002: current.json as cursor, STATUS.md as summary

**Why:** JSON parsing is deterministic across LLM providers; markdown frontmatter is fragile. Separating cursor from summary prevents conflicting writes — state mutations go to JSON, prose goes to markdown.

**See:** `runtime/lib/context.mjs:75-88`, `runtime/lib/status.mjs`.

---

## DD-003: No nested skill invocation

**Why:** Prevents recursive context cascading. Each skill starts with `get-context.mjs` — a bounded entry point. Also host-agnostic: invocation mechanisms differ across Claude/Codex/OpenCode.

---

## DD-004: Prerequisites as data, not code

Stage prerequisites declared in `contracts-data.json`. Plan requires `canonicalSpec`; execute requires `canonicalPlan`.

**Why:** LLMs comply inconsistently with soft guidance under user pressure. Data-driven prerequisites are enforced by `validate.mjs` regardless of prompt.

**See:** `runtime/lib/contracts-data.json:13-18`.

---

## DD-005: Three-tier validation

L1 (state invariants) in runtime. L2 (artifact shape) in consuming skill. L3 (prose norms) in prompts and tests.

**Why:** Runtime must stay portable across three hosts. Only L1 can be enforced identically. L2 is context-dependent. L3 is subjective.

---

## DD-006: Session bootstrap via hook, not skill

SessionStart hook produces ~100 tokens before any skill runs.

**Why:** Instant orientation without invoking a skill or reading files beyond `current.json` + `STATUS.md`. Fires on startup, resume, clear, compact — all re-entry points.

---

## DD-007: get-context.mjs is self-contained

Every skill's first action runs `scripts/get-context.mjs`. This script duplicates normalization logic from `runtime/lib/state.mjs` instead of importing it.

**Why:** Skill scripts are copied into host-specific directories where runtime module paths don't resolve. Self-containment ensures the script works regardless of where it's installed.

**See:** `skills/_shared/scripts/get-context.mjs:44` (comment).
