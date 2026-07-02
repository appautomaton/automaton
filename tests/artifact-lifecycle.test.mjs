// ARTIFACT-LIFECYCLE.md: stage handoffs, verdict routing, signal discipline, learned truth.
// Failure story: lifecycle contracts restated in two files drift apart silently (it happened
// to checkpoint semantics, see execution-contract.test.mjs). These pins keep each contract in
// its single home and keep handoff edges consistent with the skills that walk them (DD-010).
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
  assert.match(lifecycle, /may begin as an office-hours skeleton/)
  assert.match(lifecycle, /a SPEC\.md without the pointer means framing is in progress/)
  assert.doesNotMatch(lifecycle, /\.agent\/work\/<change>\/INTAKE\.md/)
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
  assert.doesNotMatch(lifecycle, /auto-ceo-review/)
  assert.match(lifecycle, /`auto-eng-review`/)

  for (const verdict of ['approved', 'approved_with_risks', 'needs_correction']) {
    assert.match(lifecycle, new RegExp(`\`${verdict}\``), `verdict ${verdict} must appear in lifecycle reference`)
  }
  assert.match(lifecycle, /Product direction has no review skill: the user approves SPEC\.md at frame's exit\./)
  assert.match(lifecycle, /\*\*Frame's exit\*\* -> the user reads and approves SPEC\.md before planning begins/)
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

test('FRAMEWORK.md is the single home for artifact signal discipline', () => {
  const framework = readFileSync(join(skillsRoot, '_shared', 'references', 'FRAMEWORK.md'), 'utf8')
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(framework, /^## Artifact Signal Discipline$/m)
  // Five rules — match the rule names rather than exact prose so wording can evolve.
  assert.match(framework, /[Mm]irror section/)
  assert.match(framework, /[Ii]ndex over transcript/)
  assert.match(framework, /[Cc]ore versus conditional/)
  assert.match(framework, /[Aa]ppend-replace/)
  assert.match(framework, /[Ii]nline default/)
  // Deletion test framing so contributors can apply it section-by-section.
  assert.match(framework, /[Dd]eletion test/)
  assert.match(framework, /loses information/)

  // The lifecycle reference points at the single home instead of redefining the rules,
  // so the two files cannot drift. Distinctive definition fragments stay FRAMEWORK-only.
  assert.match(lifecycle, /FRAMEWORK\.md` \(Artifact Signal Discipline\)/)
  for (const fragment of ['earn their place only at', 'loses information']) {
    assert.ok(framework.includes(fragment), `FRAMEWORK.md must hold the fragment: ${fragment}`)
    assert.ok(!lifecycle.includes(fragment), `ARTIFACT-LIFECYCLE.md must not redefine: ${fragment}`)
  }
})

test('checkpoint definitions live only in ARTIFACT-LIFECYCLE.md', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')
  const xmlConventions = readFileSync(join(skillsRoot, '_shared', 'authoring', 'XML-CONVENTIONS.md'), 'utf8')

  // The definitions home. Each checkpoint type's meaning is stated here once.
  assert.match(lifecycle, /## Checkpoint Semantics/)
  assert.match(lifecycle, /named product, architecture, design, scope, or risk options/)

  // XML-CONVENTIONS carried a second definitions table that drifted (its decision row
  // dropped "risk"). It now points to the single home and defines nothing.
  assert.match(xmlConventions, /defined once in `_shared\/references\/ARTIFACT-LIFECYCLE\.md` \(Checkpoint Semantics\)/)
  assert.doesNotMatch(xmlConventions, /valid only when/)
  assert.doesNotMatch(xmlConventions, /\| `human-verify` \|/)
})

test('artifact lifecycle defines the learned-truth wiki channel', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(lifecycle, /^## Learned Truth$/m)
  assert.match(lifecycle, /\.agent\/wiki\/LEARNINGS\.md/)
  assert.match(lifecycle, /one-line project facts/i)
  assert.match(lifecycle, /Evidence: path or command/)
  assert.match(lifecycle, /no transcripts, no speculation/)
  assert.match(lifecycle, /delete a line it proves false/)
})
