import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const skillsRoot = fileURLToPath(new URL('../skills', import.meta.url))
const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))
const authoredSkills = [
  'auto-onboard',
  'auto-frame',
  'auto-plan',
  'auto-execute',
  'auto-verify',
  'auto-resume',
  'auto-office-hours',
  'auto-ceo-review',
  'auto-eng-review'
]
const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
const bareAutomatonScript = /automaton\/skills\/[^/]+\/scripts\/(?:get-context|sync-status|scaffold-agent)\.mjs/
const contentDimensions = ['Audience', 'Thesis', 'Voice', 'Content Anti-Goals', 'Channel', 'Source Policy', 'Factual Risk', 'Format']

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/)

  assert.ok(match, 'expected YAML frontmatter')

  const [, rawFrontmatter, body] = match
  const fields = {}

  for (const line of rawFrontmatter.split('\n')) {
    const field = line.match(/^([a-z-]+):\s*(.*)$/)
    if (!field) {
      continue
    }

    const [, key, value] = field
    fields[key] = value
  }

  return {
    fields,
    body
  }
}

test('authored skills use valid portable frontmatter and concise bodies', () => {
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    const { fields, body } = parseFrontmatter(source)

    assert.equal(fields.name, skillName)
    assert.match(fields.name, namePattern)
    assert.ok(fields.description.length > 0)
    assert.ok(fields.description.length <= 1024)
    assert.ok(fields.compatibility.includes('Claude Code'))
    assert.ok(source.includes('metadata:\n  stage:'))
    assert.match(body, /## Do\n/)
    assert.match(body, /## Output\n/)
    assert.match(body, /## Rules\n/)
    assert.ok(body.trim().split('\n').length >= 12)
    assert.ok(source.split('\n').length <= 500)
  }
})

test('portable skill names are unique and match their directory names', () => {
  const skillDirectories = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)

  const names = skillDirectories.map((directory) => parseFrontmatter(readFileSync(join(skillsRoot, directory, 'SKILL.md'), 'utf8')).fields.name)

  assert.deepEqual(skillDirectories.sort(), authoredSkills.slice().sort())
  assert.equal(new Set(names).size, names.length)
})

test('authored skills point script commands at installed host skill roots', () => {
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.doesNotMatch(source, bareAutomatonScript, `${skillName} must not use project-root script paths`)

    if (!source.includes('get-context.mjs')) {
      continue
    }

    assert.match(
      source,
      /scripts\/get-context\.mjs/,
      `${skillName} must reference get-context.mjs from its scripts directory`
    )
  }
})

test('auto-onboard ships progressive-disclosure support docs and templates', () => {
  const onboardRoot = join(skillsRoot, 'auto-onboard')
  const expectedFiles = [
    'references/topology-scan.md',
    'references/artifact-contract.md',
    'references/question-patterns.md',
    'templates/REPO-MAP.md',
    'templates/PROJECT.md',
    'templates/REQUIREMENTS.md',
    'templates/ROADMAP.md',
    'templates/STATUS.md'
  ]

  for (const relativePath of expectedFiles) {
    assert.equal(existsSync(join(onboardRoot, relativePath)), true)
  }
})

test('auto-execute ships internal subagent prompt templates', () => {
  const skillRoot = join(skillsRoot, 'auto-execute')
  const expectedFiles = [
    'references/implementer-prompt.md',
    'references/spec-reviewer-prompt.md',
    'references/code-quality-reviewer-prompt.md'
  ]

  for (const relativePath of expectedFiles) {
    assert.equal(existsSync(join(skillRoot, relativePath)), true)
  }
})

test('authored skills ship compact local quality cards', () => {
  const markers = {
    'auto-onboard': /Onboard Anti-Patterns|Uncited repo claims/,
    'auto-frame': /SPEC Anti-Patterns|Solution leakage/i,
    'auto-plan': /PLAN Anti-Patterns|Architecture theater/,
    'auto-execute': /Execute Anti-Patterns|Obvious comments/,
    'auto-verify': /VERIFY Anti-Patterns|Completion theater/,
    'auto-resume': /Resume Anti-Patterns|Invented continuity/,
    'auto-office-hours': /Office-Hours Quality|Sycophantic validation/,
    'auto-ceo-review': /Product Review Anti-Patterns|Rubber-stamp approval/,
    'auto-eng-review': /Engineering Review Anti-Patterns|Generic risk language/
  }
  const contents = []

  for (const skillName of authoredSkills) {
    const skillRoot = join(skillsRoot, skillName)
    const source = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8')
    const qualityPath = join(skillRoot, 'references', 'quality.md')

    assert.equal(existsSync(qualityPath), true, `${skillName} must ship references/quality.md`)
    assert.match(source, /references\/quality\.md/, `${skillName} must lazy-load its local quality card`)
    assert.doesNotMatch(source, /_shared\/references\/WRITING-QUALITY\.md|WRITING-QUALITY\.md/, `${skillName} must not depend on a shared writing-quality catalog`)

    const quality = readFileSync(qualityPath, 'utf8')
    contents.push(quality)
    assert.match(quality, /Load this reference only/, `${skillName} quality card must define a lazy-load policy`)
    assert.match(quality, markers[skillName], `${skillName} quality card must be stage-specific`)
  }

  assert.equal(new Set(contents).size, authoredSkills.length)
  assert.equal(existsSync(join(skillsRoot, '_shared', 'references', 'WRITING-QUALITY.md')), false)
  assert.equal(existsSync(join(skillsRoot, '_shared', 'references', 'WRITING-QUALITY-PATTERNS.md')), false)
})

test('auto-execute subagent prompts preserve hardened subagent invariants', () => {
  const skillRoot = join(skillsRoot, 'auto-execute')
  const implementer = readFileSync(join(skillRoot, 'references', 'implementer-prompt.md'), 'utf8')
  const specReviewer = readFileSync(join(skillRoot, 'references', 'spec-reviewer-prompt.md'), 'utf8')
  const qualityReviewer = readFileSync(join(skillRoot, 'references', 'code-quality-reviewer-prompt.md'), 'utf8')

  assert.match(implementer, /NEEDS_CONTEXT/)
  assert.match(implementer, /BLOCKED/)
  assert.match(implementer, /Before you begin:/)
  assert.match(implementer, /Self-review|self-review/)
  assert.match(implementer, /Do not commit, amend, branch, or push unless/)
  assert.doesNotMatch(implementer, /Commit your work/)

  assert.match(specReviewer, /Do not trust the implementer report/)
  assert.match(specReviewer, /Inspect actual changed files/)
  assert.match(specReviewer, /Do not perform general code-quality review/)

  assert.match(qualityReviewer, /critical/)
  assert.match(qualityReviewer, /important/)
  assert.match(qualityReviewer, /minor/)
  assert.match(qualityReviewer, /ISSUES: none/)
})

test('shared references include subagent protocol but no host-specific generated mapping', () => {
  assert.equal(existsSync(join(skillsRoot, '_shared', 'references', 'SUBAGENT-PROTOCOL.md')), true)
  assert.equal(existsSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md')), true)
  assert.equal(existsSync(join(skillsRoot, '_shared', 'references', 'HOST-TOOLS.md')), false)
})

test('artifact lifecycle reference defines stage handoffs and canonical pointers', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  for (const stage of ['frame', 'plan', 'execute', 'verify', 'resume']) {
    assert.match(lifecycle, new RegExp(`\\\`${stage}\\\``))
  }

  assert.match(lifecycle, /canonical_spec/)
  assert.match(lifecycle, /canonical_plan/)
  assert.match(lifecycle, /canonical_design/)
  assert.match(lifecycle, /Do not add archive behavior/)
  assert.match(lifecycle, /\.agent\/work\/<change>/)
})

test('lifecycle controller skills load the artifact lifecycle contract', () => {
  for (const skillName of ['auto-frame', 'auto-plan', 'auto-execute', 'auto-verify', 'auto-resume']) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.match(source, /references\/ARTIFACT-LIFECYCLE\.md/, `${skillName} must load artifact lifecycle contract`)
  }
})

test('subagent protocol defines dispatch packets and bounded review loops', () => {
  const protocol = readFileSync(join(skillsRoot, '_shared', 'references', 'SUBAGENT-PROTOCOL.md'), 'utf8')

  assert.match(protocol, /## Dispatch Packet/)
  assert.match(protocol, /Subagents receive curated slice context/)
  assert.match(protocol, /`auto-execute` owns execute-stage orchestration across slices/)
  assert.match(protocol, /Cross-slice parallel dispatch is allowed only when `PLAN\.md` explicitly marks slices parallel-safe/)
  assert.match(protocol, /write sets are disjoint/)
  assert.match(protocol, /one targeted correction/)
  assert.match(protocol, /reviewer requests changes twice/)
  assert.match(protocol, /Do not invent a universal SDK or CLI/)
})

test('auto-plan requires explicit execution routing and topology on material slices', () => {
  const source = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')

  assert.match(source, /\*\*Execution:\*\* direct \| subagent recommended \| subagent required/)
  assert.match(source, /Every material slice must state an execution route/)
  assert.match(source, /Execution routing and topology/)
  assert.match(source, /auto-continue chain/)
  assert.match(source, /Parallel-safe means dependencies are independent and write sets are disjoint/)
  assert.match(source, /`Auto-continue` defaults to `no`; use `yes` only when the next slice may start after this slice passes verification/)
  assert.match(source, /Use `direct` when the slice touches/)
})

test('auto-execute owns route selection and execution-window continuation', () => {
  const source = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')

  assert.match(source, /Direct implementation and subagent implementation are two routes inside this skill/)
  assert.match(source, /Select Execution Window/)
  assert.match(source, /Always include the next uncompleted slice/)
  assert.match(source, /Execute the window serially by default/)
  assert.match(source, /Build an execution window, but execute and verify one slice at a time/)
  assert.match(source, /The route decision lives here/)
  assert.match(source, /Run the per-slice protocol/)
  assert.match(source, /Do not tell the user to invoke another execute skill/)
})

test('controller prompts use canonical state path for direct state writes', () => {
  const directUpdatePattern = /Update `current\.json`|`current\.json` updated/

  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.doesNotMatch(source, directUpdatePattern, `${skillName} must name .agent/.automaton/state/current.json for direct state writes`)
  }
})

test('auto-eng-review treats DESIGN.md as optional canonical context', () => {
  const source = readFileSync(join(skillsRoot, 'auto-eng-review', 'SKILL.md'), 'utf8')

  assert.match(source, /canonical_design/)
  assert.match(source, /DESIGN\.md` only when `canonical_design` is set and resolves to a file/)
  assert.match(source, /Missing DESIGN\.md is not a blocker/)
})

test('prompt references define canonical tags and verification context exception', () => {
  const xml = readFileSync(join(skillsRoot, '_shared', 'references', 'XML-CONVENTIONS.md'), 'utf8')
  const contextBudget = readFileSync(join(skillsRoot, '_shared', 'references', 'CONTEXT-BUDGET.md'), 'utf8')
  const execute = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')

  assert.match(xml, /Use the canonical tag name exactly/)
  assert.match(xml, /Use `<STOP>` for halt conditions/)
  assert.match(contextBudget, /verification pass/)
  assert.match(execute, /<STOP>\n\nHalt immediately/)
  assert.doesNotMatch(execute, /STOP-CONDITIONS/)
})

test('auto-office-hours ships content-intake reference with diagnostic questions', () => {
  const contentIntake = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'content-intake.md'), 'utf8')
  const skill = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')

  assert.ok(contentIntake.split('\n').length <= 120, 'content-intake reference must stay under 120 lines')
  assert.match(contentIntake, /Audience/)
  assert.match(contentIntake, /Thesis/)
  assert.match(contentIntake, /Anti-Goals/)
  assert.match(contentIntake, /Voice/)
  assert.match(skill, /Content mode/)
  assert.match(skill, /references\/content-intake\.md/)
})

test('auto-frame ships content-framing reference with anti-slop checklist', () => {
  const contentFraming = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-framing.md'), 'utf8')
  const skill = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')

  assert.ok(contentFraming.split('\n').length <= 150, 'content-framing reference must stay under 150 lines')
  assert.match(contentFraming, /Audience/)
  assert.match(contentFraming, /Thesis/)
  assert.match(contentFraming, /Anti-Slop Checklist/)
  assert.match(contentFraming, /Significance inflation/)
  assert.match(contentFraming, /Promotional language/)
  assert.match(skill, /content lens/)
  assert.match(skill, /references\/content-framing\.md/)
})

test('content references do not duplicate existing skill references', () => {
  const contentIntake = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'content-intake.md'), 'utf8')
  const contentFraming = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'content-framing.md'), 'utf8')

  assert.doesNotMatch(contentIntake, /Startup mode|Builder mode|Six Forcing Questions/, 'content-intake must not duplicate office-hours diagnostics')
  assert.doesNotMatch(contentFraming, /lens-selection\.md|LEXICON\.md/, 'content-framing must not duplicate existing auto-frame references')
})

test('content mode detection is consistent across office-hours and frame skills', () => {
  const officeHours = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const frame = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')

  const contentSignals = ['article', 'brief', 'deck', 'newsletter', 'documentation']

  for (const signal of contentSignals) {
    assert.match(officeHours, new RegExp(signal), `office-hours must detect content signal: ${signal}`)
    assert.match(frame, new RegExp(signal), `frame must detect content signal: ${signal}`)
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
  assert.match(skill, /references\/content-execution\.md/)
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
  assert.match(skill, /references\/content-verification\.md/)
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
    'auto-office-hours': readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8'),
    'auto-frame': readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8'),
    'auto-plan': readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8'),
    'auto-execute': readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8'),
    'auto-verify': readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')
  }
  const references = {
    'auto-office-hours': 'content-intake',
    'auto-frame': 'content-framing',
    'auto-plan': 'content-planning',
    'auto-execute': 'content-execution',
    'auto-verify': 'content-verification'
  }

  for (const [skillName, source] of Object.entries(sources)) {
    assert.match(source, new RegExp(references[skillName]), `${skillName} must lazy-load its content reference`)
  }
  for (const signal of ['writing', 'article', 'brief', 'deck', 'newsletter', 'documentation']) {
    assert.match(sources['auto-office-hours'], new RegExp(signal), `office-hours must detect content signal: ${signal}`)
    assert.match(sources['auto-frame'], new RegExp(signal), `frame must detect content signal: ${signal}`)
    assert.match(sources['auto-plan'], new RegExp(signal), `plan must detect content signal: ${signal}`)
  }
})

test('codex install copies content-aware skill surfaces from source', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-content-install-codex-'))
  const result = spawnSync(process.execPath, [cliPath, 'install', '--codex', root], { encoding: 'utf8' })
  const expectedReferences = {
    'auto-office-hours': 'content-intake.md',
    'auto-frame': 'content-framing.md',
    'auto-plan': 'content-planning.md',
    'auto-execute': 'content-execution.md',
    'auto-verify': 'content-verification.md'
  }

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')

  for (const [skillName, referenceFile] of Object.entries(expectedReferences)) {
    const installedSkill = join(root, '.codex', 'skills', skillName, 'SKILL.md')
    const sourceSkill = join(skillsRoot, skillName, 'SKILL.md')
    const installedReference = join(root, '.codex', 'skills', skillName, 'references', referenceFile)
    const sourceReference = join(skillsRoot, skillName, 'references', referenceFile)

    assert.equal(readFileSync(installedSkill, 'utf8'), readFileSync(sourceSkill, 'utf8'), `${skillName} SKILL.md must be refreshed from source`)
    assert.equal(readFileSync(installedReference, 'utf8'), readFileSync(sourceReference, 'utf8'), `${skillName} content reference must be refreshed from source`)
  }
})

test('auto-office-hours uses observable diagnostic checks instead of posture language', () => {
  const skill = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const antiSycophancy = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'anti-sycophancy.md'), 'utf8')

  assert.match(skill, /names concrete evidence, a specific stakeholder, or an observable workaround/)
  assert.match(skill, /Evaluate evidence directly/)
  assert.doesNotMatch(skill, /uncomfortable|Comfort means|Challenge directly|take a position/i)

  assert.match(antiSycophancy, /evidence-backed assessment/)
  assert.doesNotMatch(antiSycophancy, /take a position|point of discomfort/)
})
