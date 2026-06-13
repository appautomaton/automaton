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
