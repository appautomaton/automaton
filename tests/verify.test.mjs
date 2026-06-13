// auto-verify: a passing verification is a completed change, not a resume handoff.
// Failure story: verify is the lifecycle's only independent gate. If it trusts execute's
// evidence, recommends work after a terminal pass, or loops forever on a failing criterion,
// the gate is theater (escalation routing: ARTIFACT-LIFECYCLE.md Stage Handoffs).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'
import { ARTIFACT_LABELS } from '../lib/contracts.mjs'

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

test('auto-verify escalates a repeated criterion failure to auto-plan', () => {
  const skill = readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  // The repeat check must run before append-replace wipes the prior VERIFY-GAP block,
  // because that block is the only durable evidence the criterion failed before.
  assert.match(skill, /Before annotating, check each failing criterion for an existing `VERIFY-GAP` block/)
  assert.match(skill, /the plan or spec is the suspect, not the implementation/)
  assert.match(skill, /sync-status\.mjs --stage plan/)
  assert.match(skill, /Next: auto-plan`, naming the repeated criterion/)
  assert.match(lifecycle, /`Next: auto-plan` on a repeated fail of the same criterion/)
})

test('the VERIFY-GAP label is the same string on every end', () => {
  // The fail loop is coupled on this exact label: verify writes it into PLAN.md, execute
  // treats it as the current work on re-entry, and the lifecycle and template describe it.
  // A rename on any end silently breaks gap-fix re-entry, so every end is asserted from
  // contracts-data.json (artifactLabels.verifyGap).
  const label = ARTIFACT_LABELS.verifyGap
  const ends = {
    'auto-verify/SKILL.md': readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8'),
    'auto-execute/SKILL.md': readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8'),
    'ARTIFACT-LIFECYCLE.md': readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8'),
    'verification-template.md': readFileSync(join(skillsRoot, 'auto-verify', 'references', 'verification-template.md'), 'utf8')
  }

  for (const [name, source] of Object.entries(ends)) {
    assert.ok(source.includes(label), `${name} must carry the gap label ${label} (gap-fix re-entry contract)`)
  }
})
