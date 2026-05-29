// auto-office-hours: scope clarity, request coverage, intake, diagnostics.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

test('office-hours separates work scale from work shape', () => {
  const source = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')

  assert.match(source, /work scale/i)
  assert.match(source, /work shape/i)
  for (const shape of ['feature', 'refactor', 'parity', 'audit', 'migration', 'coverage', 'content', 'mixed']) {
    assert.match(source, new RegExp(shape, 'i'), `office-hours must mention work shape: ${shape}`)
  }
  assert.match(source, /Do not equate "large" with roadmap-sized/)
  assert.match(source, /Capability-sized work remains one spec/)
  assert.match(source, /scope preservation/i)
})

test('office-hours captures request coverage before narrowing scope', () => {
  const source = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const intakeTemplate = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'intake-template.md'), 'utf8')

  assert.match(source, /### Request Coverage/)
  assert.match(source, /perspectives or audiences/)
  assert.match(source, /explicit asks/)
  assert.match(source, /implied asks/)
  for (const bucket of ['Included', 'Deferred', 'Anti-goal', 'Needs decision']) {
    assert.match(source, new RegExp(bucket), `office-hours must classify coverage bucket: ${bucket}`)
  }
  assert.match(source, /ask one focused question or offer 2–3 concrete options/)
  assert.match(source, /Do not drop request context silently/)
  assert.match(source, /Scope coverage: included, deferred, anti-goals, and needs-decision items/)

  assert.match(intakeTemplate, /compact decision record/)
  assert.match(intakeTemplate, /## Scope Coverage/)
  assert.match(intakeTemplate, /Included:/)
  assert.match(intakeTemplate, /Deferred:/)
  assert.match(intakeTemplate, /Anti-goals:/)
  assert.match(intakeTemplate, /Needs decision:/)
  assert.match(intakeTemplate, /Mode Context/)
  assert.match(intakeTemplate, /Startup/)
  assert.match(intakeTemplate, /Builder/)
  assert.match(intakeTemplate, /Content/)
  assert.match(intakeTemplate, /Omit empty sections/)
  assert.match(intakeTemplate, /do not preserve the full alternatives analysis/)
  assert.doesNotMatch(intakeTemplate, /## Approaches Considered/)
  assert.doesNotMatch(intakeTemplate, /## Premises/)
  assert.equal(existsSync(join(skillsRoot, 'auto-office-hours', 'references', 'startup-intake-template.md')), false)
  assert.equal(existsSync(join(skillsRoot, 'auto-office-hours', 'references', 'builder-intake-template.md')), false)
})

test('auto-office-hours persists approved intake without pre-approval writes', () => {
  const source = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const template = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'intake-template.md'), 'utf8')

  assert.match(source, /Before approval, it writes nothing/)
  assert.match(source, /does not create SPEC\.md in conversational mode/)
  assert.match(source, /Persist Approved Intake/)
  assert.match(source, /Continue To Frame When Ready/)
  assert.match(source, /\.agent\/work\/<change>\/INTAKE\.md/)
  assert.match(source, /sync-status\.mjs --active-change "<change>" --stage frame/)
  assert.match(source, /records `active_change` and `stage`/)
  assert.match(source, /`stage: frame`/)
  assert.match(source, /shared state validator/)
  assert.match(source, /`INTAKE\.md` is guaranteed only for an approved office-hours session/)
  assert.match(source, /Approved, complete intake continues inline into `auto-frame` without another user prompt/)
  assert.match(source, /write `\.agent\/work\/<change>\/SPEC\.md`/)
  assert.match(source, /no file writes before the user picks an approach/)
  assert.match(template, /Write the approved intake to `\.agent\/work\/<change-name>\/INTAKE\.md`/)
})

test('auto-office-hours ships startup and builder diagnostic references', () => {
  const skill = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const startup = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'startup-diagnostic.md'), 'utf8')
  const builder = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'builder-diagnostic.md'), 'utf8')

  assert.match(skill, /references\/startup-diagnostic\.md/)
  assert.match(skill, /references\/builder-diagnostic\.md/)
  assert.match(startup, /Demand Reality/)
  assert.match(startup, /Smart Routing by Product Stage/)
  assert.match(startup, /Smart Routing by Scope Classification/)
  assert.match(builder, /coolest version/)
  assert.match(builder, /Smart Routing by Scope Classification/)
})

test('auto-office-hours uses observable diagnostic checks instead of posture language', () => {
  const skill = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const calibration = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'diagnostic-calibration.md'), 'utf8')

  assert.match(skill, /names concrete evidence, a specific stakeholder, or an observable workaround/)
  assert.match(skill, /Evaluate evidence directly/)
  assert.doesNotMatch(skill, /uncomfortable|Comfort means|Challenge directly|take a position/i)

  assert.match(calibration, /evidence-backed assessment/)
  assert.match(calibration, /Soft To Sharp/)
  assert.doesNotMatch(calibration, /take a position|point of discomfort/)
  assert.equal(existsSync(join(skillsRoot, 'auto-office-hours', 'references', 'anti-sycophancy.md')), false)
  assert.equal(existsSync(join(skillsRoot, 'auto-office-hours', 'references', 'pushback-patterns.md')), false)
  assert.equal(existsSync(join(skillsRoot, 'auto-office-hours', 'references', 'question-exemplars.md')), false)
})
