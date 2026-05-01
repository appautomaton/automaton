# Recovery Scenarios

## Scenario 1: Fresh Session, Active Change Exists

**State:** `current.json` has `active_change: "feature-x"`, `stage: "execute"`.
**Action:** Load SPEC.md, DESIGN.md, PLAN.md. Identify current slice. Summarize and recommend `auto-execute`.

## Scenario 2: Fresh Session, No Active Change

**State:** `current.json` has `active_change: "none"` or file is missing.
**Action:** Check if `.agent/` exists. If yes, read STATUS.md and ask user what to work on. If no, recommend `auto-onboard`.

## Scenario 3: Stale Canonical Pointer

**State:** `current.json` points to `.agent/work/feature-x/SPEC.md` but file does not exist.
**Action:** Report stale pointer. Search `.agent/work/` for existing artifacts. If found, ask user to confirm. If not found, recommend `auto-frame`.

## Scenario 4: current.json vs STATUS.md Mismatch

**State:** `current.json` says stage is `execute`, STATUS.md says stage is `plan`.
**Action:** Report mismatch. Prefer `current.json` for recovery (it is machine-written). Surface the discrepancy and ask user to confirm.

## Scenario 5: Review Verdict Blocks Progress

**State:** `current.json` has `product_review: "needs_clarification"` but stage is `plan`.
**Action:** Surface the review verdict. Recommend `auto-frame` to address the clarification before planning.

## Scenario 6: Scaffold-Level Steering

**State:** STATUS.md exists but contains only boilerplate. No real project truth.
**Action:** Recommend `auto-onboard`. Do not proceed with execution on scaffold-level steering.

## Scenario 7: Multiple Changes in Progress

**State:** `.agent/work/` contains multiple change directories.
**Action:** List them. Ask user which to resume. Do not guess.
