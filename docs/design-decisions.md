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

## DD-010 (SUPERSEDED): Cross-change memory is a bounded wiki file, not new machinery

`.agent/wiki/LEARNINGS.md` carries one-line, evidence-cited project facts that execution paid to learn. `auto-execute` (plan corrections) and `auto-verify` (gap diagnosis) append; `auto-plan` and `auto-execute` read it when present. The format contract lives once in `ARTIFACT-LIFECYCLE.md` (Learned Truth).

**Why:** The harness had no channel for execution-learned truth to survive a change: a gotcha discovered in slice 3 evaporated with the session unless it happened to land in slice evidence. A plain markdown file with the existing artifact disciplines (one line per fact, evidence cited, deletion when falsified) makes change N+1 smarter with zero orchestration spread and full human inspectability.

**Superseded 2026-07-28.** Removed entirely. Across 12 changes in two projects the file was never written once, while the durable facts it was meant to hold landed in a ROADMAP deferred note instead. The harness should not run a second memory system alongside a project's own documentation, which is where large projects keep this material anyway. `ROADMAP.md` remains the single long-horizon surface. Absence is now guarded in `tests/artifact-lifecycle.test.mjs`.

---

## DD-011: Install writes a receipt; uninstall and upgrade act on it

`installProject()` and `installHost()` record what only the install moment can observe into `.agent/.automaton/state/install-manifest.json`: every file written (with an LF-normalized sha256 hash), every directory created because it did not exist before, and the exact fragments merged into shared host configs (hook script references, codex feature lines actually added). Entries are tagged per owner (`project`, `claude`, `codex`, `opencode`), and each owner records the automaton version and install time that last installed it (`owners`, additive within schema 1; the top-level `automaton_version`/`installed_at` remain as the last-writer summary), so version drift is reported per host: installing one host with a newer CLI cannot silence the staleness of another, an owner whose entries predate the stamp is reported as unrecorded rather than assumed current, and receipts from before the stamp wholesale degrade to the global comparison. Downgrade rewrites (an older CLI editing a newer receipt) are explicitly out of scope: absence of a stamp is taken as proof of a pre-stamp installer. Uninstall removes exactly the recorded set, prunes only recorded-as-created directories when they end up empty, and reverts only the recorded merge fragments. Reinstall over an older receipt safe-deletes orphans (recorded files this version no longer writes) when their content still matches the recorded hash, keeps user-modified ones with a warning, and strips merge fragments the previous install recorded that this version no longer ships, so a retired hook never leaves a dangling config entry. Installs that pre-date the receipt fall back to the old source-recompute removal; a valid receipt with no entries for a host makes that host's uninstall a no-op instead, because the receipt is authoritative about what was never installed (automaton-named traces it cannot account for are reported, not deleted). Receipt entries are validated at the load boundary: absolute or traversal paths are discarded, so a corrupt manifest can never delete outside the project root. Two honest limits: shared-config preservation is semantic rather than byte-exact (merged JSON and TOML are reparsed and reserialized, so user entries survive but formatting is normalized), and a user file that collides with an automaton-owned name is replaced by the install with a warning rather than preserved.

Two asymmetric rules ride on the hashes. Host materials are pure machinery: uninstall removes them even when locally modified, with a warning, because the user asked for the harness to go. Files under `.agent/` are potential project history: uninstall removes a scaffolded steering placeholder only while it is hash-identical to what install wrote, so anything the user or onboarding touched stays as record, and `work/` and `wiki/` are never tracked for removal at all. Deprecated steering rides the same rule: a retired file such as `STATUS.md` is deleted only while it matches a known pristine placeholder body, and is otherwise kept and reported, because in real installs it accreted project truths.

**Why:** This reverses part of the post-DD-008 position that invariants should replace install bookkeeping, and the boundary is principled: invariants derive what is derivable, the receipt records what is observable only once. No invariant can answer "did `.claude/` exist before us", "did the user already have `multi_agent = true`", or "was this installed copy edited afterwards", and recompute-from-source strands orphans whenever a future version renames or retires a file. DD-008 stands unchanged for agent role ids (the belt); the receipt is the accounting for everything else (the suspenders). The runtime root `.agent/.automaton/` stays namespace-owned and untracked: it is replaced on install and removed whole on uninstall, so the receipt only carries entries for territory Automaton shares with the user. Shared-config merge handling is one table in `lib/install.mjs` (`MERGE_STRATEGIES`, keyed by receipt path) pairing each install-side ensure with its exact uninstall inverse; moving those strategies into the host adapters was rejected because it would spread receipt-provenance knowledge across modules for zero benefit at three hosts.

**See:** `lib/receipt.mjs`, `lib/install.mjs`, `tests/install-receipt.test.mjs`.

## DD-012: Continuation state is derived from durable evidence, not a new cursor

A staff-level audit (June 2026) found the weakest long-horizon link was cold mid-execute recovery: slice progress lived only in PLAN.md prose, the recovery path had no git awareness, verification evidence evaporated on PASS, and the state cursor could silently lag a repo that moved outside the harness. The fixes derive continuation state from evidence that already exists instead of adding cursor fields to `current.json`:

- `auto-resume` reconciles the execution ledger on cold re-entry: per-slice commits (`slice N:`) mark verified slices, and a dirty tree on top of the last slice commit is in-flight work for the next slice. The git rhythm's commit trail doubles as the durable execution cursor, read-only.
- `auto-verify` writes a terminal `## Verification` section to PLAN.md on PASS (append-replace), so the audit record outlives the conversation.
- `get-context.mjs` emits L2 drift hints (`state_drift`, `dirty_tree_at_verified`) when repo evidence shows movement after `current.json` was last touched, and a review-verdict integrity warning when a verdict field has no matching `## Review:` section on its artifact. Rhythm commits (`slice N:`, `slice N gap-fix:`) are excluded from the drift count: they are the ledger itself, produced between state syncs by design. Warnings never block and degrade silently without git.
- Stage prerequisites carry `canonicalSpec` from execute onward, so dependency-order loading (spec first) always resolves on resume.

**Why:** The post-DD-011 boundary applies here too: derive what is derivable. A slice cursor field would duplicate what PLAN.md evidence and the commit trail already record, and would drift from both. Reading the ledger costs two read-only git commands at resume time; no new state, no new files, no portability loss for non-git projects (every git-derived signal degrades to silence).

**See:** `skills/auto-resume/SKILL.md` (Reconcile Execution Ledger), `skills/auto-verify/SKILL.md` (On Pass), `skills/_shared/scripts/get-context.mjs`, `tests/artifact-lint.test.mjs`, `tests/artifact-lifecycle.test.mjs` (the learnings guard moved here when DD-010 was superseded).

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

**See:** `skills/_shared/references/FRAMEWORK.md` (Handoff Model), `skills/_shared/references/ARTIFACT-LIFECYCLE.md` (Handoff Contract), `skills/auto-frame/references/quality.md`, `skills/auto-eng-review/references/outside-voice.md`, `tests/verdict-routing.test.mjs`, `tests/install-receipt.test.mjs`. The SPEC skeleton this entry introduced went with the office-hours seam in DD-017.

## DD-015: A review verdict describes the plan content it reviewed

Any `--canonical-plan` sync clears a standing `engineering_review` verdict in `applyStatePatch`, even when the path is unchanged, because a re-plan rewrites the same PLAN.md file. Before this, `needs_correction` survived re-planning: auto-plan's handoff offered execute, execute's entry gate bounced on the stale verdict, and the change looped between plan and execute with only an undocumented exit (re-running the review).

**Why:** The rejected alternative was prose declaring re-review mandatory after `needs_correction`. That turns an optional check sticky-mandatory, against DD-014's posture that model-run review runs only where invoked, and the mandatory human stop at execute entry already guards the safety property. Clearing on re-sync keeps the state machine honest: a verdict field always describes the currently synced plan. The preserved `## Review: Engineering` section keeps the prior rationale on the artifact as history, and the L2 verdict-integrity lint (DD-012) is unaffected because it only checks verdict-implies-section.

**See:** `skills/_shared/scripts/sync-status.mjs` (`applyStatePatch`), `skills/_shared/references/ARTIFACT-LIFECYCLE.md` (Review Verdict Routing), `tests/lifecycle-walk.test.mjs`.

## DD-016: Automaton keeps the running log of work, not a description of the project

`.agent/` holds only artifacts that cannot be true without the harness: `current.json`, the change's `SPEC.md`, `DESIGN.md`, `PLAN.md`, its verification evidence, and `ROADMAP.md` as the forward queue. Everything that describes the project itself was removed. `auto-onboard` is deleted, `.agent/wiki/` is gone from the artifact layout, and `PROJECT.md` and `REQUIREMENTS.md` moved to `DEPRECATED_STEERING_FILES`, so an upgrade prunes a pristine placeholder and keeps a user-authored copy with a warning under the DD-011 asymmetry rule. Steering is one file.

**Why:** The test is whether a file would still be true if Automaton were uninstalled. README, AGENTS.md, and `docs/` pass, so the project owns them. A harness copy of that same truth fails twice: nothing reads it, and it decays against the original. Field evidence was unambiguous. This workspace's `REQUIREMENTS.md` cited `AGENTS.md` eleven times, then drifted from it (stage enum missing `verified`, a test count of 176 against 312, a transient May blocker parked as durable truth). `REPO-MAP.md` claimed version 0.2.31 against an actual 0.3.10 and cited the file that disproved it. No skill instruction read any of the three, and a second project shipped six changes with an empty `.agent/wiki/`. The rejected alternative was refreshing them on a schedule, which buys accuracy with maintenance and still loses to reading the repo. `automaton-librarian` answers the same questions from live code and cannot go stale, which is what a cache becomes once reading is cheap. This is DD-010's supersession generalized: LEARNINGS.md fell for duplicating `docs/`, and these fell for duplicating the repo.

**See:** `runtime/lib/steering.mjs`, `lib/scaffold.mjs` (`DEPRECATED_STEERING_FILES`), `runtime/lib/contracts-data.json` (`artifactLayout`), `skills/_shared/authoring/LEXICON.md` (steering), `tests/scaffold.test.mjs`.

## DD-017: One framing skill that chooses its own conversational depth

`auto-office-hours` folded into `auto-frame`. One skill reads the request, decides in a named `### Choose Depth` step whether the objective is already clear or needs a diagnostic, and says which path it took. The diagnostics, grill mode, and the alternatives contract moved to `references/diagnostic.md` behind that trigger. The SPEC skeleton is gone: one skill writes `SPEC.md` once.

**Why:** The two skills already declared the same `stage: frame` and loaded each other inline, each carrying a full copy of the other's entry criteria. Office-hours' first substantive step considered routing the user to auto-frame; auto-frame had stopped sending users back ("Do not send the user back to office-hours solely because no skeleton exists") and had grown its own coverage-map fallback. The split forced a routing decision at the door, before anyone had read the request, which is exactly the judgment that needs the request and the repo in hand. Field evidence: 1 of 12 changes across two projects was office-hours-seeded. The merged entry point is 1375 words against 2607 for the pair, and the duplication it removed (librarian instruction, slug derivation, `sync-status` call, the four-way coverage vocabulary stated three times) existed only because of the seam. DD-014 still holds: dialogue and artifact are distinct moments, they just are not distinct skills. The skeleton went with the seam, since a two-pass write only bought crash durability across a skill boundary that no longer exists.

**Cost accepted:** the shallow path pays +181 words over the old frame-only entry point for mode classification and the depth choice. Keeping the diagnostic machinery in the entry point would have cost +540, so it rides a trigger instead.

**Risk it creates:** phase authorship used to be structurally banned in frame because another skill owned it. Now one skill owns both paths and only explicit user approval separates an approved decomposition from a laundered scope cut. `tests/roadmap-contract.test.mjs` pins that gate.

**See:** `skills/auto-frame/SKILL.md` (Choose Depth), `skills/auto-frame/references/diagnostic.md`, `skills/_shared/references/ROADMAP-CONTRACT.md` (Update Rules), `tests/frame.test.mjs`, `tests/roadmap-contract.test.mjs`.

## DD-018: Contracts get one home, prose relay vocabulary can become data, and the handoff rule bends to its test

A three-auditor corpus read (July 2026, after DD-016/DD-017) found the trim's leftovers were not whole artifacts but within-file drift: restated contracts that had already become contradictions, dead weight on unconditional paths, and maintainer comments shipping in installed agent prompts. Fourteen passes landed as separate commits, each with its test moves, in five classes:

- **Contradiction repair.** `approved_with_risks` no longer blocks slices (the verdict already means safe to proceed). The content lens rule has one home instead of two answers. Resume no longer dispatches the librarian it is never equipped with, and its `**Next:**` line is conditional on incomplete or blocked work. Missing content core fields are a framing gap, not a planning assumption. Decks stay in the content pipeline at execute and verify. The slug is derived before the write that consumes it. A first parallel group no longer needs the prior slice commit that cannot exist.
- **One-home sweeps.** The handoff contract's edges live only in ARTIFACT-LIFECYCLE; progressive-loading guidance, phase authorship, dispatch packet shape, worktree mechanics, and orchestration-artifact ownership each collapsed to a single home, with the other sites pointing.
- **Dead weight.** `risk-examples.md` deleted (239 words loaded on every engineering review; its threshold-to-verdict mapping moved into the SKILL). The ROADMAP phase format dropped its zero-consumer `evidence` field. The empty-roadmap shape dropped its doctrine line, edited at both ends of the never-drift pair: pre-change pristine ROADMAP.md files will hash-mismatch on uninstall and be kept with a warning, the safe DD-011 direction. Recovery-scenario content that was unreachable or restated left.
- **Shipped-prompt repair.** The four role bodies each carried a maintainer comment that `readRoleBody` rendered verbatim into installed system prompts on all three hosts. The librarian role gained the DD-013 machinery boundary its siblings carry; reviewer roles now define when to return `BLOCKED`, a definition that previously lived only in the protocol they are forbidden to read.
- **Consent.** The outside voice sends plan content to another provider, and it now asks first, naming what is sent. One consent covers the loop; no configured second model means skip, not ask.

Two structural moves deserve their own record. The content track's field vocabulary (Audience, Thesis, Voice, Content Anti-Goals, then the deferred four) moved from five prose definitions into `contracts-data.json` (`contentFields`), with the test helper deriving from it: a rename is now a failing test, not silent relay drift. This extends DD-004's contracts-as-data posture to prose relay vocabulary, and the bar for any future promotion is the same: a rename must silently break a downstream consumer. And the Handoff Model's Where rule bent to match what its guard always pinned: the line must issue from inside `## Do`, after artifact writes and state mutations, never from `## Output`, with `### Hand Off` as the conventional shape rather than the only one, because verify's outcome fan-out and execute's loop-back were already compliant with the load-bearing half.

**Why:** restated contracts do not stay restated; they drift, and the audit caught the drift as live contradictions, not hypotheticals. The zero-reader test from DD-016 applied within files: content nothing reads (maintainer comments in prompts, unreachable scenarios, unconsumed fields) is a liability, not an asset.

**Cost accepted:** about +130 words of new capability (reviewer `BLOCKED` definitions, the consent gate, the Name The Change step, deck coverage, the first-parallel-group path), and the FRAMEWORK ceiling rose to 922 to hold the bent Where rule while the four-edge enumeration moved home.

**Risk it creates:** the bent Where rule concentrates the no-silent-turn guarantee in `skill-conventions.test.mjs`'s emission-location guard; a future skill could emit a stop before its artifact writes, mitigated by the rule's "after artifact writes and state mutations" clause. Content-fields-as-data sets a precedent; the discipline is that vocabulary earns promotion only when a rename silently breaks a consumer, which the content relay demonstrably did (Voice vs Voice Direction).

**See:** `runtime/lib/contracts-data.json` (`contentFields`), `skills/_shared/references/FRAMEWORK.md` (Handoff Model, Where), `skills/_shared/references/SUBAGENT-PROTOCOL.md` (Dispatch Packet, Subagent Return Statuses), `tests/context-census.test.mjs` (pass-by-pass ratchet comments), `tests/content-mode.test.mjs` (single-home guard), `docs/token-economy.md`.

## DD-019: The harness disengages on the verified sync

`current.json` gains a `disengaged` flag when a sync sets `stage: verified`, and the session hook renders a one-line quiet message instead of the standard orientation block. Any sync that starts or advances work (a new `active_change`, or any `--stage` sync) clears it.

**Why:** after a terminal pass the hook kept delivering the full orientation block for a finished change on every later session, teaching the reader to skip the one surface that also carries health findings. The flag is derived inside `applyStatePatch` rather than set by the model: derive what is derivable (DD-012's rule), so no skill has to remember a second write. Disengagement is quiet, not blind: error-level findings still surface in the quiet branch.

**See:** `skills/_shared/scripts/sync-status.mjs` (`applyStatePatch`), `runtime/lib/context.mjs` (`buildSessionContext`), `tests/state.test.mjs`, `tests/session-health.test.mjs`.

---

## DD-020: Retired skill names are append-only; install prunes them by name

`RETIRED_SKILLS` (`lib/install.mjs`) names every skill directory Automaton has shipped and retired. Install removes those names from each host skill root on every run, reports each removal as `pruned_retired_skill`, and never deletes an `auto-*` directory that is not on the list. Names are append-only: retiring a skill adds one, and no name is ever removed. `status` reports the same list as `orphaned_skill` with an unconditional "reinstall to prune it" remedy.

**Why:** removal used to be recomputed from the current source tree, which by construction cannot see a directory the source no longer ships, and the receipt only covers orphans a previous receipt recorded. Both miss the same case, so retired skills survived indefinitely. Field evidence: a project carried `auto-onboard`, `auto-office-hours`, and `auto-ceo-review` through an upgrade to 0.3.12, and two consecutive reinstalls left all three in place while `status` advised a reinstall that could not work. This is DD-008 generalized from role ids to skill directories: the append-only list is a superset of every earlier version's removals, so a newer installer cleans an older install with no bookkeeping to consult. Pruning by exact name is also what makes it safe, since a namespace sweep of `auto-*` would delete a user-authored skill. The rejected alternative was hash-guarding a namespace sweep, which needs historical hashes for every retired file in every prior version, to reach the same outcome the list gives for free.

**See:** `lib/install.mjs` (`RETIRED_SKILLS`, `pruneRetiredSkills`), `lib/drift.mjs`, `tests/hosts.test.mjs` (append-only guard, prune regression), `tests/drift.test.mjs`.

## DD-021: The census guards how many words load, and the prose standard guards what kind

Shipped skill prose states what is project-specific, counter-intuitive, or a boundary the model would otherwise cross. It does not explain what a capable model already does by default, and it does not stage a bad example so a good one looks better. Three mechanical guards back this: the semicolon ratchet, an em-dash ban at zero, and a numeric-prescription ratchet, all in `tests/punctuation-census.test.mjs`. The judgment rules live in `LEXICON.md` (Prose Standard).

**Why:** the word ceilings measure volume and are silent about type, so prose that passed a ceiling but failed the knowledge test accumulated for months. `LEXICON.md` already carried the rule ("cut anything a capable model already knows") with no test behind it, unlike the ceilings, and unguarded rules are the ones that drift. Two findings made the drift concrete rather than aesthetic. First, the corpus contained exactly two em-dashes across 55 files, and both were inside fabricated "Before:" slop samples in quality cards: the only place the project broke its own no-em-dash rule was where it performed slop deliberately, which also forced any future scan to special-case the harness's own files. Second, `ANTI-SLOP.md` prohibited "unsupported specificity: precise numbers presented without source support" while `CONTEXT-BUDGET.md` instructed the model to "compress 500 lines of evidence into 5 lines of conclusion", a ratio nobody measured, in the file that teaches context discipline. The header above it, "generate summaries, not transcripts", was the whole instruction.

Roughly 1,300 words left across 17 files and no capability went with them. Detection moved from vocabulary to structure, because a word list of 2023 tells ("vibrant", "nestled") is both dated and unbounded, while "an em-dash where a comma carries the clause" is countable and survives model changes. The numeric guard counts rather than judges: 12 numeric prescriptions survive and all of them either carry an inference or fix an output shape, so a regex that flagged fabricated numbers would have failed on good prose. Format templates were kept wherever the reader must reproduce a shape (`## Verification` headings, status envelopes, slice field names), since a model cannot guess a contract, and a lone exemplar was kept where it calibrates a threshold prose cannot convey. What went was every twin whose only job was to be worse.

**See:** `tests/punctuation-census.test.mjs` (three censuses), `tests/context-census.test.mjs` (down-ratchets), `skills/_shared/authoring/LEXICON.md` (Prose Standard), `skills/_shared/references/ANTI-SLOP.md`.

## DD-022: The census reaches Layer 2, because half the corpus was never measured

DD-021 said the census guards how many words load. It guarded entry points and shared references: 12,228 of 23,275 shipped words. The other 47%, per-skill `references/` and `role-sources/`, had no ceiling of any kind. Working sets exclude conditional pulls by design, which is right for measuring the common path, and it meant nothing measured the conditional path at all.

That gap is where the dated content survived DD-016, DD-017, and DD-021 untouched. `auto-frame` carried 2,564 words of founder-coaching diagnostics (six startup forcing questions with push targets, five builder questions, a ten-point mode doctrine, a three-layer search synthesis with an `EUREKA:` template and `{current year}` query strings) behind a trigger DD-017 measured firing in 1 of 12 changes. The register is the tell: "that's assignment #1" and "biting your tongue" address a founder. Everything else in the corpus addresses the model, tersely.

Five moves, one thesis:

- **Layer 2 census.** A per-file default of 500 words with named escapes carrying their arithmetic, plus a per-skill total that catches accumulation the per-file cap cannot see. The walk is directory-driven, so a new reference is covered the moment it lands rather than when someone remembers to list it.
- **The mode diagnostics fold into `diagnostic.md`.** What left was question text and doctrine a capable model already carries. What stayed is project-specific: which topics fire at which product stage and work scale, and the scope guard on the wedge and fastest-path topics, which is the load-bearing half. Without it a model narrows a capability-sized goal to the smallest shippable answer it just elicited.
- **`content-intake` folds into `content-framing`.** They were the only pair in the content track that co-loads, and they defined the same four fields twice, once as an elicitation bar and once as a SPEC field. Same three components, two wordings. The merge also surfaced live casing drift (`Source policy` against the canonical `Source Policy`), invisible because the `contentFields` check had never been pointed at framing.
- **FRAMEWORK stops describing the quality cards.** It claimed four sections the cards have not had since DD-021 rewrote them. The card is its own home, so the restatement is deleted rather than corrected, and no shape test replaces it: pinning the structure in a test recreates the second home somewhere else.
- **Sibling reference paths are guarded.** `startup-diagnostic.md` and `builder-diagnostic.md` both pointed at `references/shape-questions.md` from inside `references/`, which resolves to `references/references/` and never loaded, while `diagnostic.md` beside them used the correct bare form. The existing resolver guard could not see it: it resolves every pointer from the skill root, so the broken form and the working form looked identical. `frame.test.mjs` pinned the broken one.
- **Named patterns lose their glosses.** `ANTI-SLOP.md` defined all eleven patterns. Seven of those definitions restated a term any capable model already holds, and the dilution was the cost: the four lines that carry a real test (delete the third item and check, would this ending sit unchanged, does a copula say the same thing, was this ratio invented to dramatize) read as four more table rows. Names are the retrieval key. A gloss earns its line only by settling a marginal case the name leaves open. 269 words to 203.
- **Frame's entry point drops its mirror.** `## Output` restated what `## Do` had already said, against FRAMEWORK's own first signal rule. It kept one thing Do never states, the `canonical_spec` field name, which the durable-state guard caught the moment the section was cut too far. The mode axis also shed a six-synonym enumeration per mode where three carry the same boundary.

**Why:** every defect this change repairs is the same defect, and DD-018 already named it: restated contracts do not stay restated. The cure it built, data pins plus cross-file contract tests, works everywhere it is applied. All five findings sit in the gap where it is not: prose restating prose, with no data pin and no test. So the fix is not a new principle. It is the existing one reaching two more surfaces.

**Cost accepted:** the shipped corpus drops 1,350 words and four files, and only frame's working set moves (2,293 to 2,239). That split is the honest framing. Most of what was deleted was never on a common path, so most of this buys install weight, maintenance surface, and one fewer place for the next audit to find drift rather than runtime tokens. The exception proves the rule: the only cuts that moved a working set were the ones inside an entry point.

**A limit worth recording for the next auditor.** Frame's entry point is 1,337 words after this pass, and the rest of it was examined and kept. The three-axis read, the depth choice, the request coverage map, and the pre-approval write gate are all either test-pinned scope protection or the DD-017 capability this skill exists to carry. The triplicated librarian-dispatch clause in frame, plan, and execute was examined as a one-home candidate and rejected: moving it into FRAMEWORK would add 25 words to all five working sets to remove 30 from three of them, making verify strictly worse to fix a contract whose copies already cite their home inline. Frame is large because framing is the judgment-heavy stage, not because it is padded.

**Deliberately rejected:** factoring the six `quality.md` cards onto a shared spine, declined twice already (consolidation-findings C3, May and July 2026) on the grounds that indirection costs more readability than duplication costs maintenance. The FRAMEWORK drift is between FRAMEWORK and the cards, not between the cards, so deleting the restatement resolves it without reversing that call. Merging `alternatives-format.md` with `implementation-alternatives.md` was also rejected: they define "minimal viable" differently on purpose (smallest version of the goal against fewest files, smallest diff), and both files say the split is deliberate.

**Risk it creates:** the per-file default is a number, and a reference that genuinely needs more words now needs an escape entry rather than silence. That is the intended friction, but it converts a writing decision into a test edit, and the failure mode is an author padding an escape comment instead of trimming. The arithmetic requirement is the mitigation: an escape has to state what the file absorbed.

**Pass 2 (v0.4.2), the sweep the Layer 2 census made possible.** With every conditional reference finally on a scale, a second read found 425 more words that were model-known rather than dated, which is why no earlier trim caught them: nothing was wrong with any of it. Eleven trigger rows in `engineering-sections.md` said "check security when the plan touches auth", a mapping a model derives rather than looks up, so the closed list of dimensions stays and the derivable column goes. `prime-directives.md` lost zero-silent-failures, observability-scales-with-scope, and specificity-is-the-review, the last because `quality.md` already owns the actionability test and the creed was its second home. `artifact-order.md` lost an ASCII dependency graph that mirrored the table three lines below it, and two of three anti-patterns that inverted rules already stated. `slice-examples.md` lost eleven lines of worked JWT slice around the one sentence doing the calibrating. `alternatives-format.md` lost four rules restating its own header verbatim. And the risk matrix in `auto-eng-review/SKILL.md` lost its "What a 10 looks like" column, which anchored the top of a scale whose only operational rule keys off the bottom.

Two candidates were examined and kept, both because a guard proved the restatement load-bearing. The `ROADMAP-CONTRACT.md` invariant restating its own Update Rules is double-pinned by `roadmap-contract.test.mjs` on purpose: DD-017 named a narrowed SPEC becoming a phase as the risk the frame merge created, and both phrasings are asserted separately. `prime-directives.md` kept "Diagrams earn their space" because `review.test.mjs` pins it against a "Diagrams are mandatory" regression it already suffered once. A rule that exists because someone did the wrong thing is not creed, whatever it reads like.

The distinction that made this pass tractable: dated content announces itself, and model-known content does not. Only a ceiling forces the question.

**See:** `tests/context-census.test.mjs` (Layer 2 census), `tests/skill-conventions.test.mjs` (sibling-path guard), `tests/frame.test.mjs` (routing survival, scope guard), `tests/content-mode.test.mjs` (merged content reference), `skills/auto-frame/references/diagnostic.md`, `skills/auto-frame/references/content-framing.md`.

## DD-023: The harness states what it is for before anything loads

The session reminder carries one engagement criterion: the stage lifecycle earns its cost when work must survive a context boundary or when the outcome needs agreement before it is built, and work one session can finish and verify is done directly. Naming a stage overrides it. `auto-frame` gains a `Check Engagement` step that applies it after the request is read and before `Choose Depth` spends a turn. The same commit moves the `FRAMEWORK.md` read from session start to the first stage action.

**Why:** every prior trim asked how many words load and what kind. Neither asks whether the lifecycle should have engaged at all, and nothing did. `auto-frame`'s description said "Use to start any change", the work-scale enum bottomed out at `bug` with no category beneath it, and two rules pulled small work back in: frame wrote a spec for a user who tried to skip one, and execute reframed every quick fix. So a typo fix paid frame plus plan plus execute plus verify, five syncs and two artifacts, to change one line. The threshold was not missing from the project. `README.md` told humans to "move larger changes through explicit frame, plan, execute, and verify stages", and the README is the one file the model never reads. The model-facing surface said the opposite of the human-facing one.

**Why the criterion is boundary-shaped, not complexity-shaped.** The request that prompted this asked the harness to understand problem complexity. Complexity is not observable, and `LEXICON.md` (Instruction Posture) forbids keying behavior to what the model cannot observe, for the same reason it forbids self-measured token counts. What is observable is whether the work outlives the session and whether its outcome is already agreed, and those are also what the harness is for: `README.md` describes it as making work survive context limits, session restarts, and multi-step changes. Keying the gate to the value proposition means the gate cannot drift from the reason the harness exists. The rejected wording was artifact-shaped ("if `SPEC.md` would only restate the request"), which is more concrete and silent about work that spans sessions while having an obvious spec.

**Why the hook is the home.** A gate has to be evaluated before any Automaton file is read, or it costs exactly what it exists to avoid. Two surfaces qualify: frontmatter descriptions, which sit in context before any skill loads, and the session reminder. The reminder wins on reach, because all three hosts render it from one `buildSessionContext` call, so one edit covers Claude, Codex, and OpenCode, where descriptions would need six copies that drift. The descriptions are not a second home. They stop contradicting the criterion, and `skill-conventions.test.mjs` pins that they cannot start again. The criterion sits outside the disengaged branch on purpose: disengaged is precisely the state a new objective arrives in, so that is when the gate has to answer.

**Why the `FRAMEWORK.md` deferral is whole-file only.** No `SKILL.md` instructs reading `FRAMEWORK.md`. All thirteen references in the skill tree name a section and assume the file is already loaded, which `FRAMEWORK.md` itself states ("skills assume this context"). Three sections have no inline pointer from any SKILL.md at all: Skill Structure, Stages, and Handoff Model. Handoff Model defines the `**Next:**` wire format that `skill-conventions.test.mjs` enforces on every skill, and frame's working set is `FRAMEWORK.md` plus `SKILL.md` and nothing else, so a section-wise reminder would strip that format out of frame with no test failing. Moving the read later is safe and changes only when the cost lands. Splitting it is not, and `session-health.test.mjs` scans the reminder against `FRAMEWORK.md`'s own headings so the distinction cannot be edited away by accident.

**Cost accepted:** the reminder grows from 41 words to 97, paid once per session on every session including ones that never touch the harness, and frame's entry point ratchets 1,400 to 1,506. Against that, a session that does no stage work stops paying 902 words for `FRAMEWORK.md`, and a request below the criterion stops paying frame's 1,434 and everything downstream. The trade is a fixed 56-word toll against a variable four-figure saving, which is the right shape only because the toll is small enough to state in one sentence. It would not survive a paragraph.

**Scope held at entry.** `auto-execute`'s rule stays in force and only gains its reason: a mid-execution request still returns to `auto-frame`, because slice evidence and per-slice commits have to describe what the plan approved, and an unplanned edit in the same diff makes the record wrong. The criterion governs what starts a change, never what an active one absorbs. Frame's skip rule survives too, qualified to work that spans sessions, so the two paths cannot both claim the same request.

**Deliberately rejected:** a triage skill, which spends a load to decide not to load and reverses DD-016 and DD-017's 8-to-6 consolidation. A stage short-circuit in `contracts-data.json` letting bug-sized work skip plan, which changes the internal path rather than the entry, so it does not answer "should not engage at all" and weakens `stagePrerequisites` to buy nothing. Numeric thresholds such as a file count, barred by `LEXICON.md` and a poor predictor besides, since file count does not say whether work survives a session. Putting the criterion in `FRAMEWORK.md`, which is the wrong side of the gate.

**Risk it creates:** the criterion is a judgment call, and the failure mode is a model that declines work it should have framed, which is quieter than the failure it replaces. Two things bound it. The escape is explicit and cheap for the user to reach, since naming a stage settles it. And the step sits inside frame rather than before it, so the decline is stated in one line the user can contradict in their next message rather than happening silently at the trigger surface.

**See:** `runtime/lib/context.mjs` (`buildSessionContext`), `skills/auto-frame/SKILL.md` (Check Engagement), `skills/auto-execute/SKILL.md` (Rules), `tests/session-health.test.mjs` (criterion in both states, whole-file guard), `tests/skill-conventions.test.mjs` (description guard), `tests/frame.test.mjs` (off-ramp ordering), `tests/context-census.test.mjs` (ratchet arithmetic).

## DD-024: Trim by leverage, not by file size

Three consolidations, chosen by how many working sets pay for each word rather than by how long the file is. `FRAMEWORK.md` loses `## Skill Structure` to the uninstalled authoring guide. `ARTIFACT-LIFECYCLE.md` loses the five-element handoff enumeration, keeping the one item the Stage Handoffs table has no column for. `SUBAGENT-PROTOCOL.md` stops restating the condition that permits parallel dispatch and points at `auto-execute`, which owns it.

**Why leverage is the right sort order.** Every previous pass ranked candidates by file size, which is why the largest conditional references kept getting attention while `FRAMEWORK.md` sat untouched at 902 words. `FRAMEWORK.md` is the only file in all five working sets, so a word cut there is worth five, and `ARTIFACT-LIFECYCLE.md` is in four. Sixty-seven words left `FRAMEWORK.md` and forty-two left `ARTIFACT-LIFECYCLE.md`, and the net across the five working sets is 416. A 400-word cut in a conditional reference would have moved no working set at all.

**Skill Structure was authoring doctrine in a runtime file.** It described the section order of the file the reader is about to open, which is a table of contents delivered to someone already holding the book. Its two clauses that do bind runtime behavior were both stated better elsewhere in the same file: where a stop is issued is pinned in Handoff Model, and the `quality.md` requirement is pinned in Quality Gate. The move has direct precedent, since the validation tiers left `ARTIFACT-LIFECYCLE.md` for `docs/testing.md` on the same reasoning, and `XML-CONVENTIONS.md` already uses the pattern of naming FRAMEWORK as the home and keeping only the authoring rule that follows.

**The five durable elements were a mirror section.** Four of the five restated columns of the Stage Handoffs table three lines above them: artifacts produced against Produces, state mutation against State pointer expectations, next-stage recommendation against Next handoff, exit gate against the stop conditions inside Next handoff. `FRAMEWORK.md`'s own first signal rule names this ("if two sections answer the same question, delete one or reframe them"), and the reference was breaking it against itself. Diagnostic handling was the one item with no column, so it is what stayed.

**Method worth reusing.** The candidates came from an 8-gram scan across all 48 shipped files, normalized for markdown, reporting every phrase appearing in more than one file. It surfaces restatement mechanically rather than by memory, which matters because restatement is invisible to whoever wrote both copies.

**What the scan got wrong, which is the point of recording it.** Five candidates were cut, and the suite rejected two on the first run. `content-framing.md` restating "Content is a peer mode alongside Startup and Builder" is pinned in `frame.test.mjs` because `auto-frame` routes to that file directly from Select Lenses, bypassing the `diagnostic.md` that also states it. `implementation-alternatives.md` restating its own trigger is pinned in `review.test.mjs` because a lazily-loaded file declaring its own load policy is a corpus-wide convention, enforced on every `quality.md` by `skill-conventions.test.mjs`. Both were restored. A duplicate-phrase scan cannot tell a redundant copy from a deliberate one, so every hit it produces is a question, not a finding, and the guards are what answer it.

**Examined and kept, so the next auditor does not re-litigate it.** The git ban is stated in both `ARTIFACT-LIFECYCLE.md` and `auto-execute/SKILL.md`, and both are in execute's working set, so the six forbidden verbs are genuinely paid twice. It stays. `LEXICON.md` names git history as one of the four boundaries a restriction may legitimately guard, and this is the most destructive capability the harness holds. Forty-five words of proximity on `amend`, `reset`, and `rebase` is worth more than the saving, because a ban that requires a cross-file lookup is a ban the model can be one distraction away from missing. The residual overlaps the scan reports between `auto-execute` and `auto-plan` were already adjudicated in DD-022, and those two files never share a working set, so nothing pays for both.

**Cost accepted:** three tests changed shape rather than merely moving a number, which is the friction the census is designed to create. Each now pins a split instead of a phrase: the table carries the per-stage detail and the prose carries the remainder, and `auto-execute` carries the parallel condition while the protocol carries what follows from it.

**Risk it creates:** `FRAMEWORK.md` no longer tells a reader what shape a `SKILL.md` has, so a contributor who reads only the installed tree will not find the skeleton. That is the correct trade, because the installed tree is for running skills and the source tree is for writing them, but it does mean `skills/_shared/authoring/` is now load-bearing for onboarding and is not shipped.

**See:** `skills/_shared/references/FRAMEWORK.md`, `skills/_shared/references/ARTIFACT-LIFECYCLE.md` (Handoff Contract), `skills/_shared/authoring/XML-CONVENTIONS.md` (Skill Skeleton), `tests/artifact-lifecycle.test.mjs`, `tests/subagent-protocol.test.mjs`, `tests/context-census.test.mjs` (down-ratchets).
