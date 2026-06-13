# Git Rhythm Mechanics

Operational detail for the per-slice commit rhythm. The rule and commit shapes live in `SKILL.md` (Git Rhythm); the cross-skill invariants live in `.agent/.automaton/references/ARTIFACT-LIFECYCLE.md` (Git Rhythm). Read this once at execute entry.

## Detect Once At Entry

After `Mark Execute Stage` resolves, run `git rev-parse --git-dir` and `git status --porcelain`. The rhythm is silently inactive for the rest of the run when:

- the directory is not a git repo
- the user has told this run not to use git
- the repo is mid-rebase, mid-merge, mid-cherry-pick, mid-bisect, or on detached HEAD

Do not re-detect per slice. One check at entry governs the whole run.

## Pre-Existing Dirt

If `git status` reports uncommitted changes at entry, announce once in the conversation that slice 1's commit will sweep them in, then proceed without asking. The rhythm matches what `git add -A && git commit` would do manually, and recovery (`git reset HEAD~`) is in the user's normal toolkit.

## Commit Failure

If the commit operation itself fails (pre-commit hook rejection, signing failure, repo entering an interrupted state mid-run), STOP and surface the failure verbatim. Do not retry with workarounds. Do not silently skip the rhythm to keep going.

## Parallel Isolation

Plan-approved parallel-safe groups dispatch each implementer into its own worktree. The worktree is scratch isolation, not a branching strategy: the user's checked-out branch is never switched, and every result lands as a normal additive slice commit.

1. Precondition: clean tree. Pre-existing dirt is swept by a prior slice commit before fan-out.
2. Create one worktree per parallel slice, detached at HEAD (`git worktree add --detach`), so no branch ref is ever created. A host's native worktree isolation manages its own lifecycle and is fine too.
3. Dispatch implementers into their worktrees. They edit files only; subagents never run git.
4. Integrate serially in plan order: take the worktree diff, apply it to the main tree, run slice verification, then make the normal `slice N:` commit.
5. Remove each worktree (`git worktree remove`) after integration. A stray worktree found later is a reportable leftover, never something to silently delete.

An apply conflict means the plan's parallel-safe claim was wrong. STOP, record a plan correction on the affected slices, and re-enter serially. Do not hand-merge.
