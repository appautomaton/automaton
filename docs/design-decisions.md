# Design Decisions

Rationale for choices where the why is not obvious from reading the code.

---

## DD-001: Central shared references and scripts

`_shared/references/` and `_shared/scripts/` are the package authoring sources. `installProject()` copies those references once into `.agent/.automaton/references/` and scripts once into `.agent/.automaton/scripts/`. Skill prompts read shared contracts and run shared scripts from those project-common paths. `_shared/` itself is never installed into host skill trees.

Shared scripts are self-contained but no longer copied into every skill folder.

**Why:** `.agent/` is the one common root across Claude, Codex, and OpenCode installs, so shared reference docs and scripts can live there without per-skill duplication.

**See:** `lib/install.mjs` (`installProject`, `installHost`, `syncHostSkills`). Guarded by `tests/scaffold.test.mjs`, `tests/hosts.test.mjs`.

---

## DD-002: current.json as the single state cursor

`current.json` is the only source for active change, stage, canonical artifact pointers, and review verdicts. Maintained prose summaries are intentionally not part of the lifecycle contract.

**Why:** JSON parsing is deterministic across LLM providers; markdown summaries drift and cost prompt tokens. State mutations go to JSON. Human-readable context comes from canonical artifacts (`SPEC.md`, `PLAN.md`, review sections, and roadmap items) or from generated command output.

**See:** `runtime/lib/state.mjs`, `runtime/lib/context.mjs`. Guarded by `tests/state.test.mjs`, `tests/skill-conventions.test.mjs` (state writes route through sync-status).

---

## DD-003: No nested skill invocation

**Why:** Prevents recursive context cascading. Each skill starts with `get-context.mjs`, a bounded entry point. Also host-agnostic: invocation mechanisms differ across Claude/Codex/OpenCode.

**See:** Guarded by `tests/skill-conventions.test.mjs` (no mandatory nested invocation) and the recursion guards in `tests/execute.test.mjs` role assertions.

---

## DD-004: Prerequisites as data, not code

Stage prerequisites declared in `contracts-data.json`. Plan requires `canonicalSpec`; execute, verify, and verified require both `canonicalSpec` and `canonicalPlan`, so the spec chain holds end to end (DD-012).

**Why:** LLMs comply inconsistently with soft guidance under user pressure. Data-driven prerequisites are enforced by `validate.mjs` regardless of prompt.

**See:** `runtime/lib/contracts-data.json:13-18`. Guarded by `tests/contracts.test.mjs`, `tests/validate.test.mjs`, and the both-ends contract tests (`tests/execution-contract.test.mjs`, `tests/verdict-routing.test.mjs`).

---

## DD-005: Three-tier validation

L1 (state invariants) in runtime. L2 (artifact shape) in consuming skill. L3 (prose norms) in prompts and tests.

**Why:** Runtime must stay portable across three hosts. Only L1 can be enforced identically. L2 is context-dependent. L3 is subjective.

**See:** Guarded by `tests/validate.test.mjs` (L1 errors block), `tests/artifact-lint.test.mjs` (L2 warnings never block). Layer map: `docs/testing.md`.

---

## DD-006: Session bootstrap via host startup integration, not skill

Host startup integration produces a short reminder before any skill runs.

**Why:** Instant orientation without invoking a skill or summarizing progress prose. The message identifies Automaton as an installed harness, points to `current.json` and the work-artifact tree, and reminds the agent that the user's latest request remains authoritative. Claude and Codex use SessionStart hooks; OpenCode uses its plugin event/chat hooks, including compaction handling.

**See:** Guarded by `tests/hosts.test.mjs`, `tests/cli-context.test.mjs`.

---

## DD-007: get-context.mjs is self-contained

Every skill's first action runs `node .agent/.automaton/scripts/get-context.mjs`. This script duplicates normalization logic from `runtime/lib/state.mjs` instead of importing it.

**Why:** Shared skill scripts run from installed project runtime state where package source imports may not resolve. Self-containment keeps them usable across host surfaces and package/source layouts.

**See:** `skills/_shared/scripts/get-context.mjs:44` (comment). Guarded by the shared-script tests in `tests/state.test.mjs` and `tests/artifact-lint.test.mjs` (both run the scripts from temp roots where package imports cannot resolve).

---

## DD-008: Agent role ids are append-only; uninstall removes by exact name

The canonical list of Automaton subagent roles lives in `SUBAGENT_ROLES` (`lib/install.mjs`). A shipped id is never renamed or removed. New roles may only be appended. `uninstallHost()` removes each generated agent file by its exact role-derived name, not by an `automaton-*` namespace glob.

**Why:** Under append-only ids, every version's role list is a superset of every earlier version's, so a newer uninstaller names (and cleanly removes) every agent file an older install wrote; cross-version uninstall stays complete without scanning the namespace. Exact-name removal also leaves unrelated user-authored agents in `.<host>/agents/` untouched, whereas a namespace glob could delete a user file that happens to start with `automaton-`. Renames and removals (the one case exact-match cannot reconcile across version skew) are ruled out by the invariant rather than worked around in code.

**See:** `lib/install.mjs` (`SUBAGENT_ROLES`, `uninstallHost`), `tests/hosts.test.mjs` (append-only role-id guard).

---

## DD-009: L2 artifact-shape checks are script-surfaced warnings, not prose vigilance

`get-context.mjs` and `sync-status.mjs` lint the canonical SPEC and PLAN against the `artifactLint` vocabulary in `contracts-data.json` (acceptance criteria and anti-goals present in SPEC, objective/acceptance criteria/verification present per plan slice). Findings are `warning`-level diagnostics in the JSON every skill already reads as its first action.

**Why:** Asking the consuming skill to notice missing artifact shape was the most expensive and least reliable validator in the system: it costs model attention on every stage entry and is exactly the kind of check that gets skipped under context pressure. The slice format is already a pinned vocabulary, so a deterministic parser can surface the gaps for free. Warnings keep judgment with the model (a "material slice" decision stays an LLM call), and L1 remains the only error-level gate, so the harness does not get more rigid.

**See:** `runtime/lib/contracts-data.json` (`artifactLint`), `skills/_shared/scripts/get-context.mjs` (`lintArtifacts`), `tests/artifact-lint.test.mjs`.

---

## DD-010: Cross-change memory is a bounded wiki file, not new machinery

`.agent/wiki/LEARNINGS.md` carries one-line, evidence-cited project facts that execution paid to learn. `auto-execute` (plan corrections) and `auto-verify` (gap diagnosis) append; `auto-plan` and `auto-execute` read it when present. The format contract lives once in `ARTIFACT-LIFECYCLE.md` (Learned Truth).

**Why:** The harness had no channel for execution-learned truth to survive a change: a gotcha discovered in slice 3 evaporated with the session unless it happened to land in slice evidence. A plain markdown file with the existing artifact disciplines (one line per fact, evidence cited, deletion when falsified) makes change N+1 smarter with zero orchestration spread and full human inspectability.

**See:** `skills/_shared/references/ARTIFACT-LIFECYCLE.md` (Learned Truth), `tests/learnings.test.mjs`.

---

## DD-011: Install writes a receipt; uninstall and upgrade act on it

`installProject()` and `installHost()` record what only the install moment can observe into `.agent/.automaton/state/install-manifest.json`: every file written (with an LF-normalized sha256 hash), every directory created because it did not exist before, and the exact fragments merged into shared host configs (hook script references, codex feature lines actually added). Entries are tagged per owner (`project`, `claude`, `codex`, `opencode`). Uninstall removes exactly the recorded set, prunes only recorded-as-created directories when they end up empty, and reverts only the recorded merge fragments. Reinstall over an older receipt safe-deletes orphans (recorded files this version no longer writes) when their content still matches the recorded hash, keeps user-modified ones with a warning, and strips merge fragments the previous install recorded that this version no longer ships, so a retired hook never leaves a dangling config entry. Installs that pre-date the receipt fall back to the old source-recompute removal; a valid receipt with no entries for a host makes that host's uninstall a no-op instead, because the receipt is authoritative about what was never installed (automaton-named traces it cannot account for are reported, not deleted). Receipt entries are validated at the load boundary: absolute or traversal paths are discarded, so a corrupt manifest can never delete outside the project root. Two honest limits: shared-config preservation is semantic rather than byte-exact (merged JSON and TOML are reparsed and reserialized, so user entries survive but formatting is normalized), and a user file that collides with an automaton-owned name is replaced by the install with a warning rather than preserved.

Two asymmetric rules ride on the hashes. Host materials are pure machinery: uninstall removes them even when locally modified, with a warning, because the user asked for the harness to go. Files under `.agent/` are potential project history: uninstall removes a scaffolded steering placeholder only while it is hash-identical to what install wrote, so anything the user or onboarding touched stays as record, and `work/` and `wiki/` are never tracked for removal at all.

**Why:** This reverses part of the post-DD-008 position that invariants should replace install bookkeeping, and the boundary is principled: invariants derive what is derivable, the receipt records what is observable only once. No invariant can answer "did `.claude/` exist before us", "did the user already have `multi_agent = true`", or "was this installed copy edited afterwards", and recompute-from-source strands orphans whenever a future version renames or retires a file. DD-008 stands unchanged for agent role ids (the belt); the receipt is the accounting for everything else (the suspenders). The runtime root `.agent/.automaton/` stays namespace-owned and untracked: it is replaced on install and removed whole on uninstall, so the receipt only carries entries for territory Automaton shares with the user.

**See:** `lib/receipt.mjs`, `lib/install.mjs`, `tests/install-receipt.test.mjs`.

## DD-012: Continuation state is derived from durable evidence, not a new cursor

A staff-level audit (June 2026) found the weakest long-horizon link was cold mid-execute recovery: slice progress lived only in PLAN.md prose, the recovery path had no git awareness, verification evidence evaporated on PASS, and the state cursor could silently lag a repo that moved outside the harness. The fixes derive continuation state from evidence that already exists instead of adding cursor fields to `current.json`:

- `auto-resume` reconciles the execution ledger on cold re-entry: per-slice commits (`slice N:`) mark verified slices, and a dirty tree on top of the last slice commit is in-flight work for the next slice. The git rhythm's commit trail doubles as the durable execution cursor, read-only.
- `auto-verify` writes a terminal `## Verification` section to PLAN.md on PASS (append-replace), so the audit record outlives the conversation.
- `get-context.mjs` emits L2 drift hints (`state_drift`, `dirty_tree_at_verified`) when repo evidence shows movement after `current.json` was last touched, and a review-verdict integrity warning when a verdict field has no matching `## Review:` section on its artifact. Warnings never block and degrade silently without git.
- Stage prerequisites carry `canonicalSpec` from execute onward, so dependency-order loading (spec first) always resolves on resume.

**Why:** The post-DD-011 boundary applies here too: derive what is derivable. A slice cursor field would duplicate what PLAN.md evidence and the commit trail already record, and would drift from both. Reading the ledger costs two read-only git commands at resume time; no new state, no new files, no portability loss for non-git projects (every git-derived signal degrades to silence).

**See:** `skills/auto-resume/SKILL.md` (Reconcile Execution Ledger), `skills/auto-verify/SKILL.md` (On Pass), `skills/_shared/scripts/get-context.mjs`, `tests/artifact-lint.test.mjs`, `tests/learnings.test.mjs`.

## DD-013: Multi-agent coordination trusts evidence, isolates parallel writes, and keeps users sovereign over cross-model tension

A survey of seven vendored harnesses (June 2026) found the field converging on the fundamentals Automaton already had (curated dispatch packets, closed status vocabularies, orchestrator-owned scope and history) and contributed four adoptions:

- **Completion is evidence, not signal.** A subagent's completion signal is an event; the working tree is the authority. `DONE` with no matching changes is a failure; a verifiable deliverable with a dropped signal is a success. Never block on a missing signal.
- **`BLOCKED` triage.** The coordinator diagnoses the cause before reacting: context gap (one correction, redispatch), capability gap (fall back to the direct route), too-large slice (return to plan), wrong plan (stop for the user). Never redispatch unchanged work.
- **Parallel dispatch isolates in worktrees.** Plan-declared disjoint write sets remain required, and a worktree per parallel implementer makes the claim structural instead of hoped. Worktrees are scratch isolation, not branching: the user's branch is never switched, results land as normal additive slice commits, and an apply conflict proves the plan's parallel-safe claim wrong (STOP and correct the plan, never hand-merge). This is the one carve-out to the strictly-additive git rule.
- **Optional cross-model outside voice.** After an engineering verdict, a second model may review the plan content alone, terse and adversarial. Tension is surfaced to the user with both positions; cross-model agreement is a strong signal, not permission to act. Non-blocking, degrades to one line when no second model exists.

Role bodies also gained three proven phrasings: identity affirmation over prohibition for recursion guards, explicit permission to escalate (bad work is worse than no work), and a boundary against reading harness machinery.

**Why deliberate rejections are recorded too:** message buses, resident supervisors, and milestone-message protocols substitute machinery for model judgment; per-window adaptive prompt thinning solves a small-context problem this harness does not have (it targets SOTA-class models and pins prompt weight in the census instead); runtime-generated role bodies would bypass the named-agent contract that keeps role prompts installed, auditable, and structurally sandboxed; mandatory double-review on trivial slices is ceremony the route decision already prevents.

**See:** `skills/_shared/references/SUBAGENT-PROTOCOL.md`, `skills/auto-execute/references/git-rhythm.md` (Parallel Isolation), `skills/auto-eng-review/references/outside-voice.md`, `skills/auto-execute/role-sources/*-role.md`, `tests/subagent-protocol.test.mjs`.

## DD-014: Product judgment stays with the human, so the pipeline has one dialogue stage and one artifact stage

A language model does not hold product judgment, so `auto-ceo-review` was removed (July 2026). Every lean harness surveyed converged on the same shape: superpowers and OpenSpec gate the spec on a human approval, and grill-me inverts the review direction entirely, interrogating the human until intent is locked instead of pronouncing verdicts at them. Model-run review earns its tokens only where ground truth exists, which is the engineering level.

The replacement is structural, not a thinner review:

- **Dialogue lives in office-hours, automation lives in frame.** Office-hours is the human-bandwidth stage: optional, opt-in, and now carrying the grill contract (one question per message with a recommended answer, explore-before-ask, and a user-invoked or offered grill mode that walks dependent decisions to resolution and never self-escalates). Frame is the automation lane: repo evidence replaces discovery questions, and one blocking needs-decision question is its whole interview.
- **Frame's exit is a mandatory stop edge.** The user reads and approves SPEC.md before planning begins. The human reading the spec is the product review. The salvage from ceo-review lives in the artifact: a `**Bet:**` line opens every SPEC, and frame's quality card runs a four-scan self-review (placeholder, contradiction, bundling, ambiguity) before presenting it.
- **One accreting artifact.** Office-hours' approval seeds the SPEC.md skeleton and frame completes the same file, replacing the INTAKE.md handoff copy. `canonical_spec` set only by frame marks completion. The pointer, not a status field, distinguishes skeleton from spec.
- **The outside voice carries the cross-model challenge.** Bounded rounds, arbitered findings with logged reasons, honest deadlock. Product direction has no model gate anywhere.

**Migration:** upgrade is re-install. The receipt prunes the removed skill's files, a legacy `product_review` state field loads as an inert unknown key, and a legacy `INTAKE.md` remains optional framing context.

**See:** `skills/_shared/references/FRAMEWORK.md` (Handoff Model), `skills/_shared/references/ARTIFACT-LIFECYCLE.md` (Handoff Contract), `skills/auto-office-hours/references/spec-skeleton.md`, `skills/auto-frame/references/quality.md`, `skills/auto-eng-review/references/outside-voice.md`, `tests/verdict-routing.test.mjs`, `tests/install-receipt.test.mjs`.
