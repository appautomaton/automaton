import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

// The learned-truth channel: .agent/wiki/LEARNINGS.md carries one-line, evidence-cited
// project facts across changes. Writers append on plan corrections (execute) and gap
// diagnosis (verify); readers load it when present (office-hours, frame, plan, execute),
// so scoping stages respect facts earlier changes paid to learn. The format contract
// lives once in ARTIFACT-LIFECYCLE.md (Learned Truth). These tests pin both ends so a
// writer cannot exist without its readers or its contract.

const read = (skill) => readFileSync(join(skillsRoot, skill, 'SKILL.md'), 'utf8')

test('execute and verify write learned truth through the lifecycle contract', () => {
  for (const skill of ['auto-execute', 'auto-verify']) {
    const source = read(skill)
    assert.match(source, /\.agent\/wiki\/LEARNINGS\.md/, `${skill} must name the learnings file`)
    assert.match(source, /one-line/, `${skill} must keep facts to one line`)
    assert.match(
      source,
      /ARTIFACT-LIFECYCLE\.md` \(Learned Truth\)/,
      `${skill} must defer format rules to the lifecycle contract`
    )
  }
})

test('scoping and construction stages read learned truth when present', () => {
  for (const skill of ['auto-office-hours', 'auto-frame', 'auto-plan', 'auto-execute']) {
    assert.match(
      read(skill),
      /Read `\.agent\/wiki\/LEARNINGS\.md` when it exists/,
      `${skill} must load learnings opportunistically, not unconditionally`
    )
  }
})

test('learnings stay out of skills that have no role in the channel', () => {
  // The reviews reason from SPEC/PLAN and conversation; resume orients from state and
  // artifacts; onboard folds facts into steering only via the lifecycle pruning rule,
  // not its own protocol.
  for (const skill of ['auto-eng-review', 'auto-resume']) {
    assert.doesNotMatch(read(skill), /LEARNINGS\.md/, `${skill} must not join the learnings channel`)
  }
})
