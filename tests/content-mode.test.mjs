// Content-mode references and cross-skill content consistency.
// Failure story: the content track spans five skills by design (consolidation-findings C5).
// The field vocabulary drifted anyway (Voice vs Voice Direction), so the vocabulary is
// now data (contracts-data.json contentFields, pass 7); these pins keep the relay consistent.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { skillsRoot, cliPath, contentDimensions, escapeRegExp } from './support/skill-helpers.mjs'

test('auto-frame ships content-intake reference with diagnostic questions', () => {
  const contentIntake = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-intake.md'), 'utf8')
  const skill = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')

  assert.ok(contentIntake.split('\n').length <= 120, 'content-intake reference must stay under 120 lines')
  assert.match(contentIntake, /Audience/)
  assert.match(contentIntake, /Thesis/)
  assert.match(contentIntake, /Anti-Goals/)
  assert.match(contentIntake, /Voice/)
  assert.match(skill, /Content mode/)
  assert.match(skill, /references\/diagnostic\.md/)
  assert.match(readFileSync(join(skillsRoot, 'auto-frame', 'references', 'diagnostic.md'), 'utf8'), /`content-intake\.md`/)
})

test('auto-frame ships content-framing reference with anti-slop checklist', () => {
  const contentFraming = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-framing.md'), 'utf8')
  const skill = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')

  assert.ok(contentFraming.split('\n').length <= 150, 'content-framing reference must stay under 150 lines')
  assert.match(contentFraming, /Audience/)
  assert.match(contentFraming, /Thesis/)
  assert.match(contentFraming, /Anti-Slop Checklist/)
  assert.match(contentFraming, /\.agent\/\.automaton\/references\/ANTI-SLOP\.md/)
  assert.match(skill, /content lens/)
  assert.match(skill, /references\/content-framing\.md/)
})

test('content references do not duplicate existing skill references', () => {
  const contentIntake = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-intake.md'), 'utf8')
  const contentFraming = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-framing.md'), 'utf8')

  assert.doesNotMatch(contentIntake, /Startup mode|Builder mode|Six Forcing Questions/, 'content-intake must not duplicate the mode diagnostics')
  assert.doesNotMatch(contentFraming, /lens-selection\.md|LEXICON\.md/, 'content-framing must not duplicate existing auto-frame references')
})

test('content lens lexicon names the canonical content dimensions', () => {
  const lexicon = readFileSync(join(skillsRoot, '_shared', 'authoring', 'LEXICON.md'), 'utf8')

  for (const dimension of contentDimensions) {
    assert.match(lexicon, new RegExp(escapeRegExp(dimension), 'i'))
  }
})

test('auto-plan ships content-planning reference with content slice gates', () => {
  const contentPlanning = readFileSync(join(skillsRoot, 'auto-plan', 'references', 'content-planning.md'), 'utf8')
  const skill = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')

  assert.ok(contentPlanning.split('\n').length <= 120, 'content-planning reference must stay under 120 lines')
  for (const dimension of contentDimensions) {
    assert.match(contentPlanning, new RegExp(escapeRegExp(dimension)))
  }
  assert.match(contentPlanning, /Artifact target/)
  assert.match(contentPlanning, /Verification/)
  assert.match(contentPlanning, /Source And Factual Gates/)
  assert.match(skill, /references\/content-planning\.md/)
})

test('auto-execute ships content-execution reference with source and factual guards', () => {
  const contentExecution = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'content-execution.md'), 'utf8')
  const skill = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')

  assert.ok(contentExecution.split('\n').length <= 120, 'content-execution reference must stay under 120 lines')
  assert.match(contentExecution, /Never invent/)
  for (const token of ['sources', 'citations', 'metrics', 'examples', 'facts']) {
    assert.match(contentExecution, new RegExp(token))
  }
  for (const dimension of contentDimensions) {
    assert.match(contentExecution, new RegExp(escapeRegExp(dimension)))
  }
  assert.match(contentExecution, /Anti-Slop Pass/)
  assert.match(contentExecution, /\.agent\/\.automaton\/references\/ANTI-SLOP\.md/)
  assert.match(skill, /references\/content-execution\.md/)
})

// Channel, source policy, factual risk, and format are conditional by contract
// (content-intake defers them, content-framing and content-planning capture them only
// when material), so their absence must not halt a prose slice. Only the required core,
// a missing source, or an unresolved factual-risk decision stops execution.
test('content execution stops only for required-core, source, or factual-risk gaps', () => {
  const contentExecution = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'content-execution.md'), 'utf8')
  const skill = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')

  assert.match(contentExecution, /identify the required core/)
  assert.match(contentExecution, /Their absence is not a stop/)
  assert.match(contentExecution, /only when a required-core input is missing, a needed source is missing, or a factual-risk decision is unresolved/)
  assert.match(skill, /a missing required-core input, a missing source, or an unresolved factual-risk decision/)
})

test('auto-verify ships content-verification reference with evidence checks', () => {
  const contentVerification = readFileSync(join(skillsRoot, 'auto-verify', 'references', 'content-verification.md'), 'utf8')
  const skill = readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')

  assert.ok(contentVerification.split('\n').length <= 120, 'content-verification reference must stay under 120 lines')
  for (const dimension of contentDimensions) {
    assert.match(contentVerification, new RegExp(escapeRegExp(dimension)))
  }
  assert.match(contentVerification, /Evidence requirement/)
  assert.match(contentVerification, /PASS, FAIL, or PARTIAL/)
  assert.match(contentVerification, /Anti-Slop Pattern Scan/)
  assert.match(contentVerification, /\.agent\/\.automaton\/references\/ANTI-SLOP\.md/)
  assert.match(skill, /references\/content-verification\.md/)
})

test('content references defer anti-slop taxonomy to the shared reference', () => {
  const contentRefs = [
    readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-intake.md'), 'utf8'),
    readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-framing.md'), 'utf8'),
    readFileSync(join(skillsRoot, 'auto-execute', 'references', 'content-execution.md'), 'utf8'),
    readFileSync(join(skillsRoot, 'auto-verify', 'references', 'content-verification.md'), 'utf8')
  ]

  for (const source of contentRefs) {
    assert.match(source, /\.agent\/\.automaton\/references\/ANTI-SLOP\.md/)
  }

  const combinedLocalRefs = contentRefs.join('\n')
  assert.doesNotMatch(combinedLocalRefs, /Unsupported specificity/)
  assert.doesNotMatch(combinedLocalRefs, /Superficial `-ing` analysis/)
})

test('content field vocabulary has one home, one spelling, and full-pipeline deck coverage', () => {
  // Failure story: five stage files each defined the content fields and the relay drifted
  // (Voice vs Voice Direction). The vocabulary is now data (contracts-data.json
  // contentFields); prose definitions with examples live only in content-framing.
  const files = {
    intake: readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-intake.md'), 'utf8'),
    framing: readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-framing.md'), 'utf8'),
    specShape: readFileSync(join(skillsRoot, 'auto-frame', 'references', 'spec-shape.md'), 'utf8'),
    planning: readFileSync(join(skillsRoot, 'auto-plan', 'references', 'content-planning.md'), 'utf8'),
    execution: readFileSync(join(skillsRoot, 'auto-execute', 'references', 'content-execution.md'), 'utf8'),
    verification: readFileSync(join(skillsRoot, 'auto-verify', 'references', 'content-verification.md'), 'utf8')
  }

  for (const [name, source] of Object.entries(files)) {
    assert.doesNotMatch(source, /Voice Direction/i, `${name} must use the canonical field name Voice`)
  }
  assert.match(files.framing, /### Voice\n/, 'content-framing owns the Voice definition')

  for (const name of ['planning', 'execution', 'verification']) {
    assert.doesNotMatch(files[name], /\*\*Good:\*\*/, `${name} must point to content-framing for definitions, not restate them`)
  }

  // Decks enter the track at intake and planning; execution and verification must not drop them.
  assert.match(files.execution, /deck/)
  assert.match(files.verification, /deck/)

  // The lens rule has one home; the skill points at it.
  assert.match(files.framing, /The content lens rule lives here/)
  const skill = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
  assert.match(skill, /the lens set lives in `references\/content-framing\.md`/)
})

test('pass 2 content references stay local and do not duplicate pass 1 references', () => {
  const contentPlanning = readFileSync(join(skillsRoot, 'auto-plan', 'references', 'content-planning.md'), 'utf8')
  const contentExecution = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'content-execution.md'), 'utf8')
  const contentVerification = readFileSync(join(skillsRoot, 'auto-verify', 'references', 'content-verification.md'), 'utf8')

  for (const source of [contentPlanning, contentExecution, contentVerification]) {
    assert.doesNotMatch(source, /Content-Mode Diagnostic|Content-Aware SPEC\.md Fields|Q1: Audience/)
    assert.doesNotMatch(source, /_shared\/references\/WRITING-QUALITY\.md|WRITING-QUALITY\.md/)
  }
})

test('pass 2 content mode gates are consistent across lifecycle skills', () => {
  const sources = {
    'auto-frame': readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8'),
    'auto-plan': readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8'),
    'auto-execute': readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8'),
    'auto-verify': readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')
  }
  const references = {
    'auto-frame': 'content-framing',
    'auto-plan': 'content-planning',
    'auto-execute': 'content-execution',
    'auto-verify': 'content-verification'
  }

  for (const [skillName, source] of Object.entries(sources)) {
    assert.match(source, new RegExp(references[skillName]), `${skillName} must lazy-load its content reference`)
  }
  for (const signal of ['writing', 'article', 'brief', 'deck', 'newsletter', 'documentation']) {
    assert.match(sources['auto-frame'], new RegExp(signal), `frame must detect content signal: ${signal}`)
    assert.match(sources['auto-plan'], new RegExp(signal), `plan must detect content signal: ${signal}`)
  }
})

test('codex install copies content-aware skill surfaces from source', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-content-install-codex-'))
  const result = spawnSync(process.execPath, [cliPath, 'install', '--codex', root], { encoding: 'utf8' })
  const installedAntiSlop = join(root, '.agent', '.automaton', 'references', 'ANTI-SLOP.md')
  const sourceAntiSlop = join(skillsRoot, '_shared', 'references', 'ANTI-SLOP.md')
  const expectedReferences = {
    'auto-frame': 'content-framing.md',
    'auto-plan': 'content-planning.md',
    'auto-execute': 'content-execution.md',
    'auto-verify': 'content-verification.md'
  }

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(readFileSync(installedAntiSlop, 'utf8'), readFileSync(sourceAntiSlop, 'utf8'), 'shared anti-slop reference must be installed')

  for (const [skillName, referenceFile] of Object.entries(expectedReferences)) {
    const installedSkill = join(root, '.codex', 'skills', skillName, 'SKILL.md')
    const sourceSkill = join(skillsRoot, skillName, 'SKILL.md')
    const installedReference = join(root, '.codex', 'skills', skillName, 'references', referenceFile)
    const sourceReference = join(skillsRoot, skillName, 'references', referenceFile)

    assert.equal(readFileSync(installedSkill, 'utf8'), readFileSync(sourceSkill, 'utf8'), `${skillName} SKILL.md must be refreshed from source`)
    assert.equal(readFileSync(installedReference, 'utf8'), readFileSync(sourceReference, 'utf8'), `${skillName} content reference must be refreshed from source`)
  }
})
