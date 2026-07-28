// auto-resume: recovery from durable state, no invented continuity.
// Failure story: resume that narrates from memory instead of artifacts, or auto-chains a
// finished change into new work, takes direction away from the user.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

test('auto-resume recovery scenarios prefer current state and canonical artifacts', () => {
  const recovery = readFileSync(join(skillsRoot, 'auto-resume', 'references', 'recovery-scenarios.md'), 'utf8')

  assert.match(recovery, /Fresh Session, Active Change Exists/)
  assert.match(recovery, /Stale Canonical Pointer/)
  assert.match(recovery, /Report stale pointer/)
  assert.doesNotMatch(recovery, /STATUS\.md|status prose|summary text/)
})

test('auto-resume SKILL.md owns the missing-state STOP, with no duplicate scenario', () => {
  // Failure story: the missing-state halt used to live in two places, and the reference
  // copy was unreachable: the SKILL STOP fires before the reference is ever loaded.
  const skill = readFileSync(join(skillsRoot, 'auto-resume', 'SKILL.md'), 'utf8')
  const recovery = readFileSync(join(skillsRoot, 'auto-resume', 'references', 'recovery-scenarios.md'), 'utf8')

  assert.match(skill, /`current\.json` is missing[\s\S]{0,200}Recommend `automaton install`/)
  assert.match(skill, /Do not attempt recovery without a state file/)
  assert.doesNotMatch(recovery, /Missing State File/)
})

test('auto-resume treats verified completion as no automatic next skill', () => {
  const skill = readFileSync(join(skillsRoot, 'auto-resume', 'SKILL.md'), 'utf8')
  const artifactOrder = readFileSync(join(skillsRoot, 'auto-resume', 'references', 'artifact-order.md'), 'utf8')
  const recoveryScenarios = readFileSync(join(skillsRoot, 'auto-resume', 'references', 'recovery-scenarios.md'), 'utf8')

  assert.match(skill, /For verified completion, report no next lifecycle skill/)
  assert.match(recoveryScenarios, /Stage `verify`: route to `auto-verify`/)
  assert.match(recoveryScenarios, /Stage `verified`: change complete\. Report completion with no `Next:` line/)
  // One routing notation across the table: `Next: <skill>`, never arrow shorthand.
  assert.doesNotMatch(recoveryScenarios, /Stage `\w+` →/)
  assert.match(skill + recoveryScenarios, /surface them as optional future work/)
  assert.match(skill, /or "change complete"/)
  assert.match(skill, /rather than an automatic `auto-frame` handoff/)
  assert.match(artifactOrder, /surface pending roadmap items only as context/)
  assert.doesNotMatch(skill, /Change complete and ROADMAP\.md has pending items → `auto-frame`/)
  assert.doesNotMatch(skill, /Stage `verified`[^.\n]*`auto-frame`/)
})
