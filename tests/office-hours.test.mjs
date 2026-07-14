// auto-office-hours: scope clarity, request coverage, intake, diagnostics.
// Failure story: office-hours is conversational, so its failure mode is writing files before
// the user approves an approach, or dropping parts of the request without a recorded decision.
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
  const intakeTemplate = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'spec-skeleton.md'), 'utf8')

  assert.match(source, /### Request Coverage/)
  assert.match(source, /perspectives or audiences/)
  assert.match(source, /explicit asks/)
  assert.match(source, /implied asks/)
  for (const bucket of ['Included', 'Deferred', 'Anti-goal', 'Needs decision']) {
    assert.match(source, new RegExp(bucket), `office-hours must classify coverage bucket: ${bucket}`)
  }
  assert.match(source, /ask one focused question or offer concrete options/)
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

// Grill mode is the salvage of the grill-me interaction contract: the model
// extracts judgment from the human instead of pronouncing product verdicts.
// It must stay opt-in, or office-hours turns every session into an interrogation.
test('auto-office-hours carries the question contract and an opt-in grill mode', () => {
  const source = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const calibration = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'diagnostic-calibration.md'), 'utf8')
  const framework = readFileSync(join(skillsRoot, '_shared', 'references', 'FRAMEWORK.md'), 'utf8')

  // The question convention has one home (FRAMEWORK.md, Asking The User); the
  // conversational skills point at it instead of restating it with drifting counts.
  assert.match(framework, /## Asking The User/)
  assert.match(framework, /Ask one question per message, with your recommended answer/)
  assert.match(framework, /2 to 4 concrete options/)
  assert.match(source, /Asking The User convention/)
  assert.doesNotMatch(source, /2–4 concrete options|2–3 concrete options/)
  assert.match(source, /Never ask what the repo can answer/)
  assert.match(source, /resolving dependent decisions one at a time/)
  assert.match(source, /the user asks \(for example "grill me"\)/)
  assert.match(source, /high-stakes \(auth, schema, concurrency, migration, payments\)/)
  assert.match(source, /Never self-escalate into a grill/)
  assert.match(calibration, /## Grill Depth/)
  assert.match(calibration, /Walk the decision tree in dependency order/)
  assert.match(calibration, /Stress-test relationships with concrete scenarios/)
})

test('auto-office-hours seeds the approved skeleton without pre-approval writes', () => {
  const source = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const template = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'spec-skeleton.md'), 'utf8')

  assert.match(source, /Before approval, it writes nothing/)
  assert.match(source, /It does not complete the spec: auto-frame owns acceptance criteria, required outcome, and `canonical_spec`/)
  assert.match(source, /Persist Approved Objective/)
  assert.match(source, /Continue To Frame When Ready/)
  assert.match(source, /Write the SPEC skeleton to `\.agent\/work\/<change>\/SPEC\.md`/)
  assert.match(source, /sync-status\.mjs --active-change "<change>" --stage frame/)
  assert.match(source, /records `active_change` and `stage`/)
  assert.match(source, /`stage: frame`/)
  assert.match(source, /shared state validator/)
  assert.match(source, /The SPEC skeleton is guaranteed only for an approved office-hours session/)
  assert.match(source, /Approved, frame-ready skeleton continues inline into `auto-frame` without another user prompt/)
  assert.match(source, /complete `\.agent\/work\/<change>\/SPEC\.md`/)
  assert.match(source, /no file writes before the user picks an approach/)
  assert.match(template, /top half of `\.agent\/work\/<change-name>\/SPEC\.md`/)
  assert.match(template, /auto-frame owns them/)
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

// Landscape search must be reachable from every mode: its file carries Builder search
// guidance and the consent gate that governs outbound queries. A Startup-scoped trigger
// meant Builder sessions searched (or skipped searching) without ever loading either.
test('landscape awareness is reachable from every mode with its consent gate', () => {
  const source = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const landscape = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'landscape-awareness.md'), 'utf8')

  assert.match(source, /Any mode: read `references\/landscape-awareness\.md`/)
  assert.doesNotMatch(source, /Startup Mode: read `references\/startup-diagnostic\.md`[^\n]*landscape-awareness/)
  assert.match(landscape, /## Privacy Gate/)
  assert.match(landscape, /\*\*Builder mode:\*\* Search for/)
})

// Switching active_change cascade-clears the old change's canonical pointers
// (sync-status.mjs), so parking an in-flight change must be surfaced, never silent.
test('office-hours surfaces an unfinished change before switching the cursor', () => {
  const source = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')

  assert.match(source, /unfinished change at `execute` or `verify`/)
  assert.match(source, /confirm parking it before recording the new change/)
})

test('auto-office-hours references route only to steps that exist in the skill', () => {
  const landscape = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'landscape-awareness.md'), 'utf8')
  const contentIntake = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'content-intake.md'), 'utf8')
  const alternatives = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'alternatives-format.md'), 'utf8')

  // "Premise Challenge" was a reference that never existed here. Landscape findings route into
  // the skill's own steps instead.
  assert.doesNotMatch(landscape, /premise challenge/i)
  assert.match(landscape, /Request Coverage/)

  // Content is a peer mode alongside Startup and Builder, not an overlay on them.
  assert.match(contentIntake, /Content is a peer mode alongside Startup and Builder/)
  assert.doesNotMatch(contentIntake, /mode detection \(Startup or Builder\)/)

  // The minimal-viable and ideal-architecture mandate is scoped to the shapes SKILL.md
  // names, so shape-specific differentiation is not overridden by the format reference.
  assert.match(alternatives, /For bug, feature, and capability work, one must be minimal viable/)
  assert.match(alternatives, /blast radius, traceability, evidence depth, rollout risk, or verification strength/)
})

test('shape questions have one home both diagnostics point at', () => {
  // One home per contract: the per-shape question sets lived near-verbatim in
  // both mode diagnostics and could silently diverge. shape-questions.md is
  // the single home; the diagnostics carry only the pointer.
  const home = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'shape-questions.md'), 'utf8')
  const startup = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'startup-diagnostic.md'), 'utf8')
  const builder = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'builder-diagnostic.md'), 'utf8')

  for (const shape of ['Parity', 'Audit', 'Refactor', 'Migration', 'Coverage']) {
    assert.match(home, new RegExp(`\\*\\*${shape}:`), `${shape} questions must live in the home`)
  }
  for (const diagnostic of [startup, builder]) {
    assert.match(diagnostic, /references\/shape-questions\.md/)
    assert.doesNotMatch(diagnostic, /What is the reference system/, 'shape questions must not be restated in a diagnostic')
  }
})
