// auto-frame: scope preservation and adaptive SPEC shape.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

test('auto-frame preserves scope and supports adaptive SPEC shapes', () => {
  const source = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
  const specShape = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'spec-shape.md'), 'utf8')

  assert.match(source, /produces the canonical artifact: `SPEC\.md` when the request is frameable/)
  assert.match(source, /SPEC\.md` is the reloadable contract/)
  assert.match(source, /spec\/\*\.md/)
  assert.match(source, /\.agent\/work\/<active_change>\/INTAKE\.md/)
  assert.match(source, /`INTAKE\.md` is preferred context, not a prerequisite for framing/)
  assert.match(source, /Do not send the user back to office-hours solely because `INTAKE\.md` is missing/)
  assert.match(source, /Continue To Office-Hours When Not Frameable/)
  assert.match(source, /continue into `auto-office-hours`'s diagnostic and intake flow/)
  assert.match(source, /Use this only when one focused framing question is not enough/)
  assert.match(source, /Silent narrowing is a framing failure/)
  assert.match(specShape, /Broader intent/)
  assert.match(specShape, /Work scale and work shape/)
  assert.match(source, /\*\*INTAKE\.md is optional\.\*\*/)
  for (const token of ['structural change', 'behavioral invariants', 'gap matrix', 'audit questions', 'migration target', 'coverage target']) {
    assert.match(specShape, new RegExp(token, 'i'), `auto-frame spec shape must support adaptive spec token: ${token}`)
  }
})

test('auto-frame checks request coverage before writing SPEC', () => {
  const source = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
  const specShape = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'spec-shape.md'), 'utf8')

  assert.match(source, /### Coverage Check/)
  assert.match(source, /scope coverage/)
  assert.match(source, /target user or stakeholder/)
  assert.match(source, /Included items must appear/)
  assert.match(source, /Deferred items must stay deferred/)
  assert.match(source, /Anti-goals must appear/)
  assert.match(source, /Needs-decision items require one focused question or 2–3 concrete options/)
  assert.match(source, /Do not drop a material item silently/)
  assert.match(specShape, /Target user or stakeholder/i)
  assert.match(specShape, /Scope coverage decisions/i)
})
