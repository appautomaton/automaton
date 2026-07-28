# Recovery Scenarios

## Scenario 1: Fresh Session, Active Change Exists

**State:** `current.json` has `active_change: "feature-x"`, `stage: "execute"`.
**Action:** Load SPEC.md, DESIGN.md when present, and PLAN.md. Identify the current slice from PLAN.md evidence, then reconcile against the execution ledger (`git log --oneline -15`, `git status --porcelain`): the last `slice N:` commit is the last verified slice, and a dirty tree on top of it is in-flight work for the next slice. Summarize; route to `auto-execute`.

## Scenario 1b: Mid-Slice Interruption

**State:** Stage `execute`. The last slice commit is `slice 4: ...` but the working tree is dirty and PLAN.md shows slice 5 without completion evidence.
**Action:** Slice 5 was in flight when the session died. Name the uncommitted files, note that slice 5 resumes from partial work (the next slice commit sweeps it in), and route to `auto-execute`. Do not commit, revert, or clean anything: resume is read-only.

## Scenario 2: Fresh Session, No Active Change

**State:** `current.json` exists with `active_change: "none"`.
**Action:** Read `.agent/steering/ROADMAP.md` for pending phases and ask the user what to work on.

## Scenario 2b: Missing State File

**State:** `.agent/` does not exist, or `current.json` is missing.
**Action:** This is the SKILL.md STOP condition. Halt, recommend `automaton install`, and do not attempt recovery without a state file.

## Scenario 3: Stale Canonical Pointer

**State:** `current.json` points to `.agent/work/feature-x/SPEC.md` but file does not exist.
**Action:** Report stale pointer. Search `.agent/work/` for existing artifacts. If found, ask user to confirm. If not found, route to `auto-frame`.

## Scenario 4: Review Verdict Blocks Progress

**State:** `current.json` has `engineering_review: "needs_correction"` but stage is `execute`.
**Action:** Surface the review verdict. route to `auto-plan` to address the correction before execution continues.

## Scenario 5: Multiple Changes in Progress

**State:** `.agent/work/` contains multiple change directories.
**Action:** List them. Ask user which to resume. Do not guess.

## Stage Routing

- Stage `frame` with no SPEC.md: route to `auto-frame`.
- Stage `frame` with SPEC.md: route to `auto-plan`. The user approves SPEC.md at that stop.
- Stage `plan` with no PLAN.md: route to `auto-plan`.
- Stage `plan` with PLAN.md: route to `auto-execute`. Mention `auto-eng-review` only when execution safety needs review.
- Stage `execute`: route to `auto-execute`.
- Stage `verify`: route to `auto-verify`.
- Stage `verified`: change complete. Report completion with no `Next:` line.
- Change complete and ROADMAP.md has pending items: surface them as optional future work with no next lifecycle skill by default.
- Change complete and no pending roadmap items: `none - change complete`.
