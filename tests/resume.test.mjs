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

test('auto-resume recovery scenarios agree with the SKILL.md STOP on missing state', () => {
  const recovery = readFileSync(join(skillsRoot, 'auto-resume', 'references', 'recovery-scenarios.md'), 'utf8')

  assert.match(recovery, /Missing State File/)
  assert.match(recovery, /`current\.json` is missing[\s\S]{0,200}recommend `auto-onboard`/)
  assert.match(recovery, /do not attempt recovery without a state file/i)
  assert.doesNotMatch(recovery, /file is missing[\s\S]{0,120}ask user what to work on/i)
})

test('auto-resume treats verified completion as no automatic next skill', () => {
  const skill = readFileSync(join(skillsRoot, 'auto-resume', 'SKILL.md'), 'utf8')
  const artifactOrder = readFileSync(join(skillsRoot, 'auto-resume', 'references', 'artifact-order.md'), 'utf8')
  const recoveryScenarios = readFileSync(join(skillsRoot, 'auto-resume', 'references', 'recovery-scenarios.md'), 'utf8')

  assert.match(skill, /For verified completion, report no next lifecycle skill/)
  assert.match(recoveryScenarios, /Stage `verify`: `Next: auto-verify`/)
  assert.match(recoveryScenarios, /Stage `verified`: change complete\. Report completion with no `Next:` line/)
  // One routing notation across the table: `Next: <skill>`, never arrow shorthand.
  assert.doesNotMatch(recoveryScenarios, /Stage `\w+` →/)
  assert.match(skill + recoveryScenarios, /surface them as optional future work/)
  assert.match(skill, /none - change complete/)
  assert.match(skill, /Do not turn a completed verified change into an automatic `auto-office-hours` handoff/)
  assert.match(artifactOrder, /surface pending roadmap items only as context/)
  assert.doesNotMatch(skill, /Change complete and ROADMAP\.md has pending items → `auto-office-hours`/)
  assert.doesNotMatch(skill, /Stage `verified`[^.\n]*`auto-office-hours`/)
})
