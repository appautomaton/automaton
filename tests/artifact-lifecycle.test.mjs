// ARTIFACT-LIFECYCLE.md: stage handoffs, verdict routing, signal discipline.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

test('artifact lifecycle reference defines stage handoffs and canonical pointers', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')
  const framework = readFileSync(join(skillsRoot, '_shared', 'references', 'FRAMEWORK.md'), 'utf8')

  for (const stage of ['frame', 'plan', 'execute', 'verify', 'verified', 'resume']) {
    assert.match(framework, new RegExp(`\\\`${stage}\\\``))
  }

  assert.match(framework, /canonical_spec/)
  assert.match(framework, /canonical_plan/)
  assert.match(framework, /canonical_design/)
  assert.match(framework, /current\.json/)
  assert.match(framework, /sync-status\.mjs/)
  assert.match(lifecycle, /do not create a separate status prose artifact to mirror them/)
  assert.match(lifecycle, /Do not add archive behavior/)
  assert.match(lifecycle, /\.agent\/work\/<change>/)
  assert.match(lifecycle, /\.agent\/work\/<change>\/INTAKE\.md/)
  assert.match(lifecycle, /discovered by `active_change`, not by a canonical pointer/)
})

test('artifact lifecycle supports progressive disclosure without scope narrowing', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(lifecycle, /## Progressive Disclosure/)
  assert.match(lifecycle, /SPEC\.md` and `PLAN\.md` are canonical indexes/)
  assert.match(lifecycle, /\.agent\/work\/<change>\/spec\/\*\.md/)
  assert.match(lifecycle, /\.agent\/work\/<change>\/slices\/\*\.md/)
  assert.match(lifecycle, /\.agent\/work\/<change>\/orchestration\/\*\.md/)
  assert.match(lifecycle, /conditional: subagent route or complex review loops only/)
  assert.match(lifecycle, /Unlinked supplemental files are notes, not contract/)
  assert.match(lifecycle, /inline slices update `PLAN\.md`; linked detail slices update `slices\/slice-NNN\.md`/)
  assert.match(lifecycle, /Split a change only for independent outcomes/)
  assert.match(lifecycle, /Do not split or narrow one coherent outcome/)
})

test('artifact lifecycle reference documents review verdict routing', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(lifecycle, /## Review Verdict Routing/)
  assert.match(lifecycle, /`auto-ceo-review`/)
  assert.match(lifecycle, /`auto-eng-review`/)

  for (const verdict of ['approved', 'approved_with_risks', 'needs_clarification', 'descoped', 'needs_correction']) {
    assert.match(lifecycle, new RegExp(`\`${verdict}\``), `verdict ${verdict} must appear in lifecycle reference`)
  }
})

test('artifact lifecycle allows clean execute-to-verify continuation', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(lifecycle, /`auto-verify` is the mandatory gate, not an optional review/)
  assert.match(lifecycle, /Continue inline by default/)
  assert.match(lifecycle, /does not force the user to re-invoke the next skill/)
})

test('artifact lifecycle reference defines handoff contract and validation tiers', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(lifecycle, /^## Handoff Contract$/m)
  assert.match(lifecycle, /[Ee]xit gate/)
  assert.match(lifecycle, /[Aa]rtifacts? produced/)
  assert.match(lifecycle, /[Ss]tate mutation/)
  assert.match(lifecycle, /[Dd]iagnostic handling/)
  assert.match(lifecycle, /[Nn]ext-stage recommendation/)
  assert.match(lifecycle, /\*\*Continue inline\*\*/)
  assert.match(lifecycle, /\*\*Stop and hand off\*\*/)
  assert.match(lifecycle, /not nested skill invocation/)
  assert.match(lifecycle, /Do not invent a universal Skill tool or hidden dispatcher/)

  assert.match(lifecycle, /^## Validation Tiers$/m)
  assert.match(lifecycle, /L1 Coordination/)
  assert.match(lifecycle, /L2 Artifact shape/)
  assert.match(lifecycle, /L3 Norms/)
  assert.match(lifecycle, /runtime\/lib\/validate\.mjs/)
})

test('artifact lifecycle reference defines artifact signal discipline', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(lifecycle, /^## Artifact Signal Discipline$/m)
  // Five rules — match the rule names rather than exact prose so wording can evolve.
  assert.match(lifecycle, /[Mm]irror section/)
  assert.match(lifecycle, /[Ii]ndex over transcript/)
  assert.match(lifecycle, /[Cc]ore versus conditional/)
  assert.match(lifecycle, /[Aa]ppend-replace/)
  assert.match(lifecycle, /[Ii]nline default/)
  // Deletion test framing so contributors can apply it section-by-section.
  assert.match(lifecycle, /[Dd]eletion test/)
  assert.match(lifecycle, /loses information/)
})
