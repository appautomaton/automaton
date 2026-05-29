// auto-verify: a passing verification is a completed change, not a resume handoff.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

test('auto-verify treats pass as completed change, not resume handoff', () => {
  const skill = readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')
  const template = readFileSync(join(skillsRoot, 'auto-verify', 'references', 'verification-template.md'), 'utf8')
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')
  const roadmap = readFileSync(join(skillsRoot, '_shared', 'references', 'ROADMAP-CONTRACT.md'), 'utf8')

  assert.match(skill, /Do not print a `Next:` line on PASS/)
  assert.match(skill, /New objective.*`auto-office-hours`/)
  assert.match(skill, /Use `auto-resume` only for later re-entry or recovery/)
  assert.match(skill, /PASS closeout: report `Change status: complete` and `New objective: use auto-office-hours`; no `Next:` line/)
  assert.match(skill, /sync-status\.mjs --stage verify/)
  assert.match(skill, /sync-status\.mjs --stage verified/)
  assert.match(skill, /sync-status\.mjs --stage execute/)
  assert.match(template, /PASS summary:/)
  assert.match(template, /New objective.*`auto-office-hours`/)
  assert.match(template, /use the `New objective` line for future work instead/)
  assert.match(lifecycle, /`stage: verified` is terminal/)
  assert.match(lifecycle, /`auto-office-hours` mention is for a new objective, not a same-change handoff/)
  assert.match(roadmap, /during re-entry or recovery/)
  assert.doesNotMatch(skill, /Next: auto-resume/)
  assert.doesNotMatch(template, /Recommended next skill:\*\* \[none/)
  assert.doesNotMatch(lifecycle, /`auto-resume` on pass/)
})
