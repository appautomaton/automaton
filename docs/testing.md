# Testing Map

The suite is the enforcement layer for a prompt-driven system. Skills are markdown, so most regressions are prose regressions: a renamed label, a softened rule, a second copy of a contract that drifts. Tests catch what code review of prose misses (DD-004: LLMs comply inconsistently under pressure, so rules must be machine-checked). The suite is also the rationale archive: when a guard fires, its header comment and failure message should teach why the rule exists, so an agent that trips it learns instead of bouncing.

## Layers

Every test file belongs to exactly one primary layer.

| Layer | What it proves | Failure smell it catches |
| --- | --- | --- |
| runtime-behavior | Real code does the right thing when executed | A script or lib function broke |
| cross-file contract | Two or more files agree on a vocabulary pinned once in `contracts-data.json` | A silent rename on one side of a handoff |
| prose-norm | A skill's markdown keeps a load-bearing rule, boundary, or structure | A rule was softened, deleted, or restated until it drifted |
| install-host | The installer and host adapters wire surfaces correctly | An installed project diverges from source |
| budget | Per-file and per-stage word ceilings hold | Prompt weight creeps up without a conscious decision |

**The preferred form is the cross-file contract.** When the same literal must appear in two or more files, do not pin it twice with string matches. Pin the vocabulary once in `runtime/lib/contracts-data.json`, export it from `runtime/lib/contracts.mjs`, and assert every end from the data. Worked example: `tests/execution-contract.test.mjs` (the plan to execute topology vocabulary). String-pinning the same literal in two prose files is not robustness, it is a future contradiction (see LEXICON.md, Instruction Posture).

## File map

| File | Layer | Guards | Rationale home |
| --- | --- | --- | --- |
| `state.test.mjs` | runtime-behavior | current.json round-trip, snake/camel normalization, shared script state writes | DD-002, DD-007 |
| `contracts.test.mjs` | runtime-behavior | contracts-data.json drives every exported vocabulary | DD-004 |
| `validate.test.mjs` | runtime-behavior | L1 stage and pointer validation, error diagnostics block | DD-004, DD-005 |
| `artifact-lint.test.mjs` | runtime-behavior | L2 shape lint surfaces warnings, never blocks | DD-009 |
| `lifecycle-walk.test.mjs` | runtime-behavior | Full state-machine walk through the real scripts, every stage edge | DD-002, DD-004 |
| `cli-context.test.mjs` | runtime-behavior | CLI install, status, context commands against temp roots | DD-006 |
| `paths.test.mjs` | runtime-behavior | Path resolution helpers | layout in contracts-data |
| `retrieval.test.mjs` | runtime-behavior | Stage retrieval order summary | progressive-disclosure.md |
| `scaffold.test.mjs` | runtime-behavior | `.agent/` tree scaffolding, seed-only-when-missing | DD-001 |
| `execution-contract.test.mjs` | cross-file contract | plan to execute routes, checkpoints, topology label, checkpoint semantics single home | consolidation-findings C1 |
| `verdict-routing.test.mjs` | cross-file contract | review verdict to next-skill routing in three prose tables | DD-004 pattern |
| `skill-conventions.test.mjs` | prose-norm | Cross-skill skeleton, frontmatter, state-write routing, tag vocabulary | FRAMEWORK.md, DD-003 |
| `artifact-lifecycle.test.mjs` | prose-norm | Stage handoffs, signal-discipline single home, learned-truth contract | ARTIFACT-LIFECYCLE.md, DD-010 |
| `subagent-protocol.test.mjs` | prose-norm | Dispatch packet, named-agent dispatch, anti-slop taxonomy | SUBAGENT-PROTOCOL.md |
| `librarian.test.mjs` | prose-norm | Read-only explore role, opt-in librarian roster | LIBRARIAN.md, DD-008 |
| `learnings.test.mjs` | prose-norm | Learned-truth writers, readers, and non-members | DD-010 |
| `execute.test.mjs` | prose-norm | Route ownership, execution windows, role sources and dispatch prompts | auto-execute SKILL.md, SUBAGENT-PROTOCOL.md |
| `verify.test.mjs` | prose-norm | Terminal pass semantics, repeat-failure escalation | auto-verify SKILL.md |
| `plan.test.mjs` | prose-norm | Lean slice defaults, traceability preservation | auto-plan SKILL.md |
| `frame.test.mjs` | prose-norm | Scope preservation, adaptive SPEC shapes, coverage check | auto-frame SKILL.md |
| `office-hours.test.mjs` | prose-norm | Pre-approval write ban, request coverage, diagnostics | auto-office-hours SKILL.md |
| `onboard.test.mjs` | prose-norm | Bounded evidence artifacts, no speculative roadmap | auto-onboard SKILL.md, ROADMAP-CONTRACT.md |
| `resume.test.mjs` | prose-norm | Recovery from durable state, no invented continuity | auto-resume SKILL.md |
| `review.test.mjs` | prose-norm | Review template economy, optional DESIGN.md | review SKILL.md files |
| `roadmap-contract.test.mjs` | prose-norm | Phase authorship reserved to user-approved decomposition | ROADMAP-CONTRACT.md |
| `content-mode.test.mjs` | prose-norm | Content lens track across five skills, anti-slop deferral | content-*.md references |
| `hosts.test.mjs` | install-host | Host adapters, agent definitions, append-only role ids, uninstall | DD-001, DD-006, DD-008 |
| `install-receipt.test.mjs` | install-host | Receipt shape, directory provenance, zero-trace uninstall, history preservation, orphan cleanup, legacy fallback | DD-011 |
| `cli-smoke.test.mjs` | install-host | Full-tree install in temp dirs, paths with spaces, symlinks | slow by design, see below |
| `context-census.test.mjs` | budget | Word ceilings per shared reference, skill, and stage working set | CONTEXT-BUDGET.md |

`cli-smoke.test.mjs` is slow because it copies the entire source tree into a temp dir to prove the package installs from an arbitrary location. Do not add scenarios to it that `lifecycle-walk.test.mjs` or `cli-context.test.mjs` can cover with a cheap scaffold.

## Authoring rules for new tests

1. **Pick the layer first.** If the rule spans files, reach for the cross-file contract form before writing a string pin.
2. **The failure must teach.** Header comment states the failure story this guard prevents. Assertion messages state the contract, not the string ("auto-plan must emit the route vocabulary verbatim, or execute silently falls back to direct"). Model: `tests/execution-contract.test.mjs`, `tests/context-census.test.mjs`.
3. **Cite the rationale home.** If a DD or shared reference owns the why, name it in the header comment. If none does, consider whether the decision deserves a DD entry.
4. **Fixtures must satisfy the lint.** Tests that assert exact-empty diagnostics need well-shaped SPEC and PLAN fixtures (see `LINT_CLEAN_SPEC` in `state.test.mjs`).
5. **Never weaken a guard to make an edit pass.** A failing prose pin is a decision point: either the edit is wrong, or the contract changed and the test, its rationale, and the prose move together in one commit.

## Validation Tiers

Runtime validation has three tiers. Keep each check at the lowest tier that catches the failure; do not promote artifact-shape or norm checks into runtime.

| Tier | Scope | Enforced by | Example |
| --- | --- | --- | --- |
| **L1 Coordination** | Cross-skill state invariants | `runtime/lib/validate.mjs`; `error`-level diagnostic; hard stop | Stage enum, canonical pointer resolves to an existing file |
| **L2 Artifact shape** | A single artifact's downstream consumability | `get-context.mjs` and `sync-status.mjs` artifact lint surfaces `warning`-level diagnostics; the consuming skill judges them | SPEC.md has Acceptance Criteria; PLAN.md slices have verification commands |
| **L3 Norms** | Wording, structure, prose quality | Prompt text + repository regression tests | Bounded goal is one sentence; lifecycle skills avoid mandatory nested invocation |

Runtime stays portable across Claude, Codex, and OpenCode by holding only L1 checks. L2 lives where artifacts are consumed. L3 lives in prompts and regression tests. Running skills need only the operational half, pinned in ARTIFACT-LIFECYCLE.md (Handoff Contract): error diagnostics block advancement, warning diagnostics surface to the next stage.
