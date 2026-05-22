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
    assert.ok(fields.description.length > 10, `${skillName} description too short`)
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

  const artifactContract = readFileSync(join(onboardRoot, 'references', 'artifact-contract.md'), 'utf8')
  const projectTemplate = readFileSync(join(onboardRoot, 'templates', 'PROJECT.md'), 'utf8')
  const repoMapTemplate = readFileSync(join(onboardRoot, 'templates', 'REPO-MAP.md'), 'utf8')
  const requirementsTemplate = readFileSync(join(onboardRoot, 'templates', 'REQUIREMENTS.md'), 'utf8')
  const skill = readFileSync(join(onboardRoot, 'SKILL.md'), 'utf8')
  const quality = readFileSync(join(onboardRoot, 'references', 'quality.md'), 'utf8')
  const questionPatterns = readFileSync(join(onboardRoot, 'references', 'question-patterns.md'), 'utf8')
  const roadmapTemplate = readFileSync(join(onboardRoot, 'templates', 'ROADMAP.md'), 'utf8')
  const sharedRoadmapContract = readFileSync(join(skillsRoot, '_shared', 'references', 'ROADMAP-CONTRACT.md'), 'utf8')

  assert.match(artifactContract, /do not duplicate canonical artifact paths/)
  assert.match(artifactContract, /name artifact roles instead/)
  assert.match(artifactContract, /Do not use durable artifacts as scratchpads/)
  assert.match(artifactContract, /do not include `Open Questions`, `Import Verdict`/)
  assert.match(artifactContract, /do not carry generic unknowns/)
  assert.match(artifactContract, /never write phases during first-time onboarding/)
  assert.match(projectTemplate, /compact identity record/)
  assert.doesNotMatch(projectTemplate, /## Current System Model/)
  assert.match(requirementsTemplate, /durable constraints only/)
  assert.doesNotMatch(requirementsTemplate, /### Observed/)
  assert.doesNotMatch(requirementsTemplate, /## Open Risks and Unknowns/)
  assert.match(repoMapTemplate, /## Blocking Ambiguities/)
  assert.doesNotMatch(repoMapTemplate, /## Open Questions/)
  assert.doesNotMatch(repoMapTemplate, /## Import Verdict/)
  assert.doesNotMatch(repoMapTemplate, /recommended next skill/)
  assert.match(skill, /Do not create roadmap phases on a first run/)
  assert.match(skill, /Treat artifact writing as expensive/)
  assert.match(skill, /no open-question parking, confidence verdict, or recommended next skill/)
  assert.match(quality, /Question parking/)
  assert.match(quality, /Routing chatter/)
  assert.match(quality, /Template gravity/)
  assert.match(skill, /user confirms importing or refreshing it in chat/)
  assert.match(questionPatterns, /do not ask during first-time onboarding/)
  assert.match(questionPatterns, /Candidate future work is not enough/)
  assert.match(sharedRoadmapContract, /must not create roadmap phases during first-time onboarding/)
  assert.match(sharedRoadmapContract, /must not synthesize roadmap phases from repo evidence alone during refresh/)
  assert.match(roadmapTemplate, /No roadmap phases yet/)
  assert.match(roadmapTemplate, /First-time onboarding does not create roadmap phases/)
  assert.match(roadmapTemplate, /user confirmation in chat/)
  assert.doesNotMatch(roadmapTemplate, /repo-evident independent outcomes/)
  assert.doesNotMatch(roadmapTemplate, /Phase 1: \.\.\./)
  assert.doesNotMatch(roadmapTemplate, /Keep this to 3 to 6 phases/)
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
  assert.match(lifecycle, /`current\.json` is the cursor/)
  assert.match(lifecycle, /`STATUS\.md` is a compact human summary, not a pointer registry/)
  assert.match(lifecycle, /Do not duplicate canonical SPEC, DESIGN, PLAN/)
  assert.match(lifecycle, /Do not add archive behavior/)
  assert.match(lifecycle, /\.agent\/work\/<change>/)
  assert.match(lifecycle, /\.agent\/work\/<change>\/INTAKE\.md/)
  assert.match(lifecycle, /discovered by `active_change`, not by a canonical pointer/)
})

test('auto-resume treats STATUS prose paths as non-authoritative summary text', () => {
  const recovery = readFileSync(join(skillsRoot, 'auto-resume', 'references', 'recovery-scenarios.md'), 'utf8')

  assert.match(recovery, /STATUS\.md Mentions Old Artifact Paths/)
  assert.match(recovery, /Prefer `current\.json` and the canonical artifacts/)
  assert.match(recovery, /stale summary text/)
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
  const startupTemplate = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'startup-intake-template.md'), 'utf8')
  const builderTemplate = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'builder-intake-template.md'), 'utf8')

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

  for (const template of [startupTemplate, builderTemplate]) {
    assert.match(template, /compact decision record/)
    assert.match(template, /## Scope Coverage/)
    assert.match(template, /Included:/)
    assert.match(template, /Deferred:/)
    assert.match(template, /Anti-goals:/)
    assert.match(template, /Needs decision:/)
    assert.match(template, /Omit empty sections/)
    assert.match(template, /do not preserve the full alternatives analysis/)
    assert.doesNotMatch(template, /## Approaches Considered/)
    assert.doesNotMatch(template, /## Premises/)
  }
})

test('review and verification templates avoid nobody-reads-this bulk', () => {
  const officeHours = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const verify = readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')
  const verificationTemplate = readFileSync(join(skillsRoot, 'auto-verify', 'references', 'verification-template.md'), 'utf8')
  const engReview = readFileSync(join(skillsRoot, 'auto-eng-review', 'SKILL.md'), 'utf8')
  const engineeringSections = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'engineering-sections.md'), 'utf8')
  const primeDirectives = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'prime-directives.md'), 'utf8')
  const alternatives = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'implementation-alternatives.md'), 'utf8')

  assert.match(officeHours, /INTAKE\.md is a decision record, not a transcript/)
  assert.match(verify, /Build the full criterion checklist internally/)
  assert.match(verify, /Do not print a long pass transcript/)
  assert.match(verificationTemplate, /The full checklist is internal/)
  assert.match(verificationTemplate, /report passing criteria as grouped counts/)
  assert.match(engReview, /Use this matrix as an internal checklist/)
  assert.match(engReview, /Do not emit the full risk matrix/)
  assert.match(engReview, /only when the plan carries non-trivial engineering risk/)
  assert.match(engineeringSections, /trigger-based risk checklist/)
  assert.match(engineeringSections, /do not write "No issues found" filler/)
  assert.doesNotMatch(engineeringSections, /Never skip a section/)
  assert.doesNotMatch(primeDirectives, /Diagrams are mandatory/)
  assert.match(primeDirectives, /Diagrams earn their space/)
  assert.match(alternatives, /Use this only when PLAN\.md lacks an approach rationale/)
  assert.doesNotMatch(alternatives, /This is not optional/)
})

test('auto-frame preserves scope and supports adaptive SPEC shapes', () => {
  const source = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')

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
  assert.match(source, /Broader intent/)
  assert.match(source, /Work scale and work shape/)
  assert.match(source, /\*\*INTAKE\.md is optional\.\*\*/)
  for (const token of ['structural change', 'behavioral invariants', 'gap matrix', 'audit questions', 'migration target', 'coverage target']) {
    assert.match(source, new RegExp(token, 'i'), `auto-frame must support adaptive spec token: ${token}`)
  }
})

test('auto-frame checks request coverage before writing SPEC', () => {
  const source = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')

  assert.match(source, /### Coverage Check/)
  assert.match(source, /scope coverage/)
  assert.match(source, /target user or stakeholder/)
  assert.match(source, /Included items must appear/)
  assert.match(source, /Deferred items must stay deferred/)
  assert.match(source, /Anti-goals must appear/)
  assert.match(source, /Needs-decision items require one focused question or 2–3 concrete options/)
  assert.match(source, /Do not drop a material item silently/)
  assert.match(source, /Target user or stakeholder/)
  assert.match(source, /Scope coverage decisions/)
})

test('plan execute and verify preserve linked detail and traceability IDs', () => {
  const plan = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')
  const execute = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')
  const verify = readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')

  assert.match(plan, /slices\/slice-NNN\.md/)
  assert.match(plan, /Requirement traceability/)
  assert.match(plan, /gap IDs/)
  assert.match(plan, /Do not collapse traceable requirements into untraceable prose/)
  assert.match(execute, /linked detail files and traceability IDs/)
  assert.match(execute, /load those linked files for the active slice/)
  assert.match(verify, /Linked detail file and traceability IDs/)
  assert.match(verify, /unlinked supplemental file/)
})

test('read-only skills do not include the state-write template', () => {
  for (const skillName of ['auto-resume']) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.doesNotMatch(
      source,
      /Run `sync-status\.mjs` from this skill's scripts directory/,
      `${skillName} is read-only and must not include the state-write template`
    )
    assert.doesNotMatch(
      source,
      /Update `\.agent\/\.automaton\/state\/current\.json`:/,
      `${skillName} must not include the canonical state-update list`
    )
  }
})

test('auto-office-hours persists approved intake without pre-approval writes', () => {
  const source = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const template = readFileSync(join(skillsRoot, 'auto-office-hours', 'references', 'startup-intake-template.md'), 'utf8')

  assert.match(source, /Before approval, it writes nothing/)
  assert.match(source, /does not create SPEC\.md in conversational mode/)
  assert.match(source, /Persist Approved Intake/)
  assert.match(source, /Continue To Frame When Ready/)
  assert.match(source, /\.agent\/work\/<change>\/INTAKE\.md/)
  assert.match(source, /Update `\.agent\/\.automaton\/state\/current\.json`:/)
  assert.match(source, /`active_change` → `<change>`/)
  assert.match(source, /`stage` → `frame`/)
  assert.match(source, /Run `sync-status\.mjs` from this skill's scripts directory/)
  assert.match(source, /`INTAKE\.md` is guaranteed only for an approved office-hours session/)
  assert.match(source, /Approved, complete intake should flow into `auto-frame` without another user prompt/)
  assert.match(source, /write `\.agent\/work\/<change>\/SPEC\.md`/)
  assert.match(source, /no file writes before the user picks an approach/)
  assert.match(template, /Write the approved intake to `\.agent\/work\/<change-name>\/INTAKE\.md`/)
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
  assert.match(protocol, /Use orchestration artifacts only for subagent routes or complex review loops/)
  assert.match(protocol, /Write the summary first/)
  assert.match(protocol, /Future coordinators should read `slice-NNN-summary\.md`/)
  assert.match(protocol, /Role files are optional/)
  assert.match(protocol, /Never paste full source files, full command logs, or chat transcripts/)
  assert.match(protocol, /one targeted correction/)
  assert.match(protocol, /reviewer requests changes twice/)
  assert.match(protocol, /Do not invent a universal SDK or CLI/)
})

test('auto-plan defines lean slice defaults without dropping execution safety', () => {
  const source = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')

  assert.match(source, /Artifact discipline: `PLAN\.md` is the reloadable execution index/)
  assert.match(source, /Bounded: it can be executed and verified without loading unrelated slices/)
  assert.match(source, /\*\*Execution:\*\* direct \| subagent recommended \| subagent required/)
  assert.match(source, /\*\*Checkpoint after:\*\* none \| human-verify \| decision \| human-action/)
  assert.match(source, /Required:/)
  assert.match(source, /Defaults, state only when overriding:/)
  assert.match(source, /Include when useful:/)
  assert.match(source, /Every material slice must have acceptance criteria/)
  assert.match(source, /Omitted `Execution` means `direct`/)
  assert.match(source, /Omitted `Checkpoint after` means `none`/)
  assert.match(source, /Execution routing and topology/)
  assert.match(source, /default continuation path/)
  assert.match(source, /Parallel-safe means dependencies are independent and write sets are disjoint/)
  assert.match(source, /Continuation is the default/)
  assert.match(source, /execution should continue through all approved slices/)
  assert.match(source, /execution windows are context-management batches, not planned stopping points/)
  assert.match(source, /Verification findings, implementation caveats, downstream consequences, and next-slice recommendations are not checkpoints/)
  assert.match(source, /concrete question and options/)
  assert.match(source, /Do not use `decision` for reversible engineering judgment/)
  assert.doesNotMatch(source, /\*\*Context budget:\*\*/)
  assert.doesNotMatch(source, /Context budget for this change/)
  assert.doesNotMatch(source, /known fraction of the context window/)
  assert.doesNotMatch(source, /~X% of context window/)
})

test('durable artifact templates avoid context budget math', () => {
  const contextBudget = readFileSync(join(skillsRoot, '_shared', 'references', 'CONTEXT-BUDGET.md'), 'utf8')
  const sliceExamples = readFileSync(join(skillsRoot, 'auto-plan', 'references', 'slice-examples.md'), 'utf8')
  const lexicon = readFileSync(join(skillsRoot, '_shared', 'authoring', 'LEXICON.md'), 'utf8')

  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    assert.doesNotMatch(source, /^Context budget:/m, `${skillName} must use artifact/loading discipline language`)
    assert.doesNotMatch(source, /^### Context Budget$/m, `${skillName} must use context loading discipline headings`)
  }

  assert.match(contextBudget, /Keep artifacts concrete/)
  assert.match(contextBudget, /Do not write context-budget fields, token-allocation notes, or percentage estimates/)
  assert.match(contextBudget, /Context-size estimates in PLAN\.md/)
  assert.match(lexicon, /loading discipline/)
  assert.match(lexicon, /context pressure/)
  assert.doesNotMatch(sliceExamples, /Context budget/)
  assert.doesNotMatch(sliceExamples, /% of context window/)
})

test('auto-execute owns route selection and execution-window continuation', () => {
  const source = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')

  assert.match(source, /Direct implementation and subagent implementation are two routes inside this skill/)
  assert.match(source, /Select Execution Window/)
  assert.match(source, /Continuation is the default after a verified slice/)
  assert.match(source, /An execution window is a context-management batch, not a completion boundary/)
  assert.match(source, /Always include the next uncompleted slice/)
  assert.match(source, /Checkpoint after: none/)
  assert.match(source, /Missing `Execution` means `direct`/)
  assert.match(source, /Missing `Checkpoint after` means `none`/)
  assert.match(source, /missing acceptance criteria or verification/)
  assert.match(source, /validate that it actually requires human input/)
  assert.match(source, /Do not pause for checkpoint text that only records verification findings/)
  assert.match(source, /Record a plan correction, keep the evidence, and continue/)
  assert.match(source, /Record completion evidence in place/)
  assert.match(source, /The slice status still updates in place/)
  assert.match(source, /If the slice is inline in `PLAN\.md`, update that slice entry in `PLAN\.md`/)
  assert.match(source, /If the slice has `Detail: slices\/slice-NNN\.md`, update that linked detail file/)
  assert.match(source, /Do not create separate execution evidence files by default/)
  assert.match(source, /\*\*Status:\*\* complete \| blocked \| needs-plan-correction/)
  assert.match(source, /Append-replace the evidence block/)
  assert.match(source, /Do not paste transcripts, full command logs, or source excerpts/)
  assert.match(source, /do not invent slice cursor or checkpoint fields/)
  assert.match(source, /The next slice is selected from `PLAN\.md`/)
  assert.match(source, /Execute the window serially by default/)
  assert.match(source, /Build an execution window, but execute and verify one slice at a time/)
  assert.match(source, /The route decision lives here/)
  assert.match(source, /Run the per-slice protocol/)
  assert.match(source, /Do not tell the user to invoke another execute skill/)
  assert.match(source, /continue into `auto-verify`'s contract/)
  assert.match(source, /Do not make the user run `auto-verify` manually/)
  assert.match(source, /Do not trust execute's own slice evidence as final verification/)
  assert.match(source, /return to \*\*Select Execution Window\*\* immediately/)
  assert.match(source, /"N slices remain" is progress state, not a stop reason/)
  assert.match(source, /Remaining approved slices require another execution-window pass/)
})

test('auto-execute stop examples require bounded diagnostics before halting on uncertainty', () => {
  const source = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'stop-examples.md'), 'utf8')

  assert.match(source, /run one bounded diagnostic/)
  assert.doesNotMatch(source, /unsure after 30 seconds/)
})

test('auto-verify treats pass as completed change, not resume handoff', () => {
  const skill = readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')
  const template = readFileSync(join(skillsRoot, 'auto-verify', 'references', 'verification-template.md'), 'utf8')
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')
  const roadmap = readFileSync(join(skillsRoot, '_shared', 'references', 'ROADMAP-CONTRACT.md'), 'utf8')

  assert.match(skill, /Do not print a `Recommended next skill` line on PASS/)
  assert.match(skill, /New objective.*`auto-office-hours`/)
  assert.match(skill, /Use `auto-resume` only for later re-entry or recovery/)
  assert.match(skill, /PASS closeout: report `Change status: complete` and `New objective: use auto-office-hours`; do not emit `Recommended next skill`/)
  assert.match(template, /PASS summary:/)
  assert.match(template, /New objective.*`auto-office-hours`/)
  assert.match(template, /use the `New objective` line for future work instead/)
  assert.match(lifecycle, /no next lifecycle skill on pass/)
  assert.match(lifecycle, /`auto-office-hours` mention is for a new objective, not a same-change handoff/)
  assert.match(roadmap, /during re-entry or recovery/)
  assert.doesNotMatch(skill, /Recommended next skill: `auto-resume`/)
  assert.doesNotMatch(template, /Recommended next skill:\*\* \[none/)
  assert.doesNotMatch(lifecycle, /`auto-resume` on pass/)
})

test('auto-resume treats verified completion as no automatic next skill', () => {
  const skill = readFileSync(join(skillsRoot, 'auto-resume', 'SKILL.md'), 'utf8')
  const artifactOrder = readFileSync(join(skillsRoot, 'auto-resume', 'references', 'artifact-order.md'), 'utf8')

  assert.match(skill, /For verified completion, report no next lifecycle skill/)
  assert.match(skill, /Stage `verify` → change complete; report completion/)
  assert.match(skill, /surface them as optional future work/)
  assert.match(skill, /none - change complete/)
  assert.match(skill, /Do not turn a completed verified change into an automatic `auto-office-hours` handoff/)
  assert.match(artifactOrder, /surface pending roadmap items only as context/)
  assert.doesNotMatch(skill, /Change complete and ROADMAP\.md has pending items → `auto-office-hours`/)
  assert.doesNotMatch(skill, /Stage `verify`[^.\n]*`auto-office-hours`/)
})

test('artifact lifecycle allows clean execute-to-verify continuation', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(lifecycle, /continue into `auto-verify`'s contract/)
  assert.match(lifecycle, /same session can safely do so/)
  assert.match(lifecycle, /should not force the user to manually invoke the next lifecycle skill/)
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
  const xml = readFileSync(join(skillsRoot, '_shared', 'authoring', 'XML-CONVENTIONS.md'), 'utf8')
  const contextBudget = readFileSync(join(skillsRoot, '_shared', 'references', 'CONTEXT-BUDGET.md'), 'utf8')
  const execute = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')

  assert.match(xml, /Use the canonical name exactly/)
  assert.match(xml, /Use `<STOP>` for halt conditions/)
  assert.match(xml, /Decision checkpoints require a concrete question and named options/)
  assert.match(xml, /`<GATE>`/)
  assert.doesNotMatch(xml, /HARD-GATE/)
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

test('lifecycle skills express handoff in durable-state vocabulary', () => {
  const lifecycleSkills = ['auto-frame', 'auto-plan', 'auto-execute', 'auto-verify', 'auto-resume']

  for (const skillName of lifecycleSkills) {
    const skill = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.match(skill, /current\.json|canonical_/, `${skillName} must reference durable state via current.json or canonical pointers`)
    assert.match(skill, /diagnostic/i, `${skillName} must describe diagnostic handling`)
    assert.match(skill, /[Rr]ecommended next skill|next skill|New objective|Change status/, `${skillName} must describe next action, completion, or future objective`)
    assert.match(skill, /\.agent\/(?:work|steering)\/|SPEC\.md|PLAN\.md|DESIGN\.md|STATUS\.md/, `${skillName} must name an artifact path`)
  }
})

test('authored skills do not mandate nested skill invocation', () => {
  // The Automaton handoff contract is durable: skills produce artifacts, update state, and
  // either recommend, continue, or report completion. Direct user/host invocation
  // (e.g. /auto-plan) stays valid; only mandatory nested skill-to-skill invocation is forbidden.
  // The deny-list is narrow on
  // purpose — it only matches explicit must/mandatory/required modifiers around invocation,
  // so legitimate uses of "mandatory" for artifacts or methodology are not affected.
  const mandatoryInvocationPatterns = [
    /must invoke/i,
    /mandatory[^.\n]{0,40}Skill tool/i,
    /required to invoke/i,
    /Do not just recommend/i,
    /invoke[^.\n]{0,60}directly via the Skill tool/i
  ]

  for (const skillName of authoredSkills) {
    const skill = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    for (const pattern of mandatoryInvocationPatterns) {
      assert.doesNotMatch(skill, pattern, `${skillName} contains mandatory nested-invocation phrasing matching ${pattern}`)
    }
  }
})

test('artifact lifecycle reference defines handoff contract and validation tiers', () => {
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(lifecycle, /^## Handoff Contract$/m)
  assert.match(lifecycle, /[Ee]xit gate/)
  assert.match(lifecycle, /[Aa]rtifacts? produced/)
  assert.match(lifecycle, /[Ss]tate mutation/)
  assert.match(lifecycle, /[Dd]iagnostic handling/)
  assert.match(lifecycle, /[Nn]ext-stage recommendation/)
  assert.match(lifecycle, /recommend, prepare, or continue into the next stage/)
  assert.match(lifecycle, /Seamless continuation is not mandatory nested skill invocation/)
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

test('auto-frame and auto-plan distinguish core from conditional sections', () => {
  // The doctrine requires lifecycle SKILL.md required-section lists to label every
  // field as core (always present) or conditional (include only when a trigger applies).
  // Match case-insensitively because individual skills may use Title Case for labels.
  const frame = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
  const plan = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')

  for (const [skillName, source] of [['auto-frame', frame], ['auto-plan', plan]]) {
    assert.match(source, /\*\*core\*\*/i, `${skillName} must label core fields/sections`)
    assert.match(source, /\*\*conditional\*\*/i, `${skillName} must label conditional fields/sections`)
    assert.match(source, /trigger/i, `${skillName} must state a trigger for each conditional field/section`)
  }
})

test('every skill preamble contains a "does not" boundary sentence', () => {
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    const preambleMatch = source.match(/## Preamble\n\n([\s\S]*?)(?=\n## )/)

    if (preambleMatch) {
      assert.match(
        preambleMatch[1],
        /does not/i,
        `${skillName} preamble must contain a "does not" boundary sentence`
      )
    }
  }
})

test('every skill with a preamble contains a loading discipline sentence', () => {
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    const preambleMatch = source.match(/## Preamble\n\n([\s\S]*?)(?=\n## )/)

    if (preambleMatch) {
      assert.match(
        preambleMatch[1],
        /Loading discipline:|Context budget:/,
        `${skillName} preamble must contain a loading discipline sentence`
      )
    }
  }
})

test('only allowed XML tags appear in SKILL.md files', () => {
  const allowed = new Set(['GATE', 'STOP', 'INTERVIEW', 'MODE-DETECTION'])

  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    const tags = source.match(/<([A-Z][A-Z0-9-]*)>/g) || []

    for (const tag of tags) {
      const name = tag.slice(1, -1)
      assert.ok(
        allowed.has(name),
        `${skillName} uses disallowed XML tag <${name}>. Allowed: ${[...allowed].join(', ')}`
      )
    }
  }
})

test('output sections use canonical diagnostic verbs', () => {
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    const outputMatch = source.match(/## Output\n\n([\s\S]*?)(?=\n## |$)/)

    if (!outputMatch) continue

    const output = outputMatch[1]

    if (/diagnostic/i.test(output)) {
      assert.match(
        output,
        /block/,
        `${skillName} Output must use "block" for error diagnostics`
      )
      assert.match(
        output,
        /surface/,
        `${skillName} Output must use "surface" for warning diagnostics`
      )
    }
  }
})

test('no skill uses "does not require nested invocation"', () => {
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    assert.doesNotMatch(
      source,
      /does not require nested invocation/,
      `${skillName} must use "does not chain" instead of "does not require nested invocation"`
    )
  }
})

test('no skill uses <HARD-GATE>', () => {
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    assert.doesNotMatch(
      source,
      /HARD-GATE/,
      `${skillName} must use <GATE> instead of <HARD-GATE>`
    )
  }
})
