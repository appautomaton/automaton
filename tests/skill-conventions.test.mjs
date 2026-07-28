// Cross-skill structural conventions every authored skill must satisfy (FRAMEWORK.md skeleton).
// Failure story: a skill that drifts from the shared skeleton, or routes state writes around
// sync-status.mjs, breaks every downstream consumer that assumes the contract (DD-002, DD-003).
// A failing pin here is a decision point: fix the edit, or change the contract, its rationale,
// and this guard together (docs/testing.md, authoring rule 5).
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot, authoredSkills, namePattern, perSkillScriptCommand, parseFrontmatter } from './support/skill-helpers.mjs'

test('authored skills use valid portable frontmatter and concise bodies', () => {
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    const { fields, body } = parseFrontmatter(source)

    assert.equal(fields.name, skillName)
    assert.match(fields.name, namePattern)
    assert.ok(fields.description.length > 0)
    assert.ok(fields.description.length <= 1024)
    assert.ok(fields.description.length > 10, `${skillName} description too short`)
    assert.ok(source.includes('metadata:\n  stage:'), `${skillName} frontmatter must declare metadata.stage: a lifecycle stage or utility (a reader-facing label; runtime stages live in contracts-data.json)`)
    assert.match(body, /## Do\n/, `${skillName} must keep the shared skeleton section ## Do (FRAMEWORK.md, Skill Structure)`)
    assert.match(body, /## Output\n/, `${skillName} must keep the shared skeleton section ## Output (FRAMEWORK.md, Skill Structure)`)
    assert.match(body, /## Rules\n/, `${skillName} must keep the shared skeleton section ## Rules (FRAMEWORK.md, Skill Structure)`)
    assert.ok(body.trim().split('\n').length >= 12, `${skillName} body is too thin to be a real contract`)
    assert.ok(source.split('\n').length <= 500, `${skillName} exceeds 500 lines: entry points stay lean, move detail to references/ behind a trigger (word ceilings: context-census.test.mjs)`)
  }
})

test('portable skill names are unique and match their directory names', () => {
  // Dot-directories are local host residue the repo gitignores (.claude/, .DS_Store
  // siblings); they are not authored skills and must not fail the census.
  const skillDirectories = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.'))
    .map((entry) => entry.name)

  const names = skillDirectories.map((directory) => parseFrontmatter(readFileSync(join(skillsRoot, directory, 'SKILL.md'), 'utf8')).fields.name)

  assert.deepEqual(skillDirectories.sort(), authoredSkills.slice().sort())
  assert.equal(new Set(names).size, names.length)
})

test('authored skills point script commands at shared project runtime scripts', () => {
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.doesNotMatch(source, perSkillScriptCommand, `${skillName} must not use per-skill script commands`)

    if (!source.includes('get-context.mjs')) {
      continue
    }

    assert.match(
      source,
      /node \.agent\/\.automaton\/scripts\/get-context\.mjs/,
      `${skillName} must reference get-context.mjs from the shared runtime scripts directory`
    )
    assert.match(
      source,
      /get-context\.mjs` from the project root/,
      `${skillName} must tell agents to run get-context.mjs from the project root`
    )
  }
})

test('authored skills ship compact local quality cards', () => {
  const markers = {
    'auto-frame': /SPEC Anti-Patterns|Solution leakage/i,
    'auto-plan': /PLAN Anti-Patterns|Architecture theater/,
    'auto-execute': /Execute Anti-Patterns|Obvious comments/,
    'auto-verify': /VERIFY Anti-Patterns|Completion theater/,
    'auto-resume': /Resume Anti-Patterns|Invented continuity/,
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

test('the change-parking rule has one home and both frame-stage entry points cite it', () => {
  // Syncing a new active_change cascade-clears the prior change's pointers
  // (sync-status.mjs applyStatePatch), so an unfinished change must be parked
  // consciously, never silently. Failure story: office-hours carried the full
  // rule but auto-frame, an equal entry point, did not, so framing directly
  // over a mid-execute change reset the cursor with no confirmation. The rule
  // lives once in FRAMEWORK.md (State Contract, per LEXICON one-home posture).
  const framework = readFileSync(join(skillsRoot, '_shared', 'references', 'FRAMEWORK.md'), 'utf8')
  assert.match(framework, /unfinished change at `execute` or `verify`/, 'FRAMEWORK.md State Contract must carry the parking rule')
  assert.match(framework, /confirm parking it/, 'the parking rule must require user confirmation')

  for (const skillName of ['auto-frame']) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    assert.match(
      source,
      /parking rule in `\.agent\/\.automaton\/references\/FRAMEWORK\.md` \(State Contract\)/,
      `${skillName} records a new active_change and must cite the parking rule home`
    )
  }
})

test('read-only skills do not include the state-write template', () => {
  for (const skillName of ['auto-resume']) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.doesNotMatch(
      source,
      /sync-status\.mjs/,
      `${skillName} is read-only and must not include the state-write template`
    )
    assert.doesNotMatch(
      source,
      /Update `\.agent\/\.automaton\/state\/current\.json`:/,
      `${skillName} must not include the canonical state-update list`
    )
  }
})

test('every handoff-carrying skill issues its handoff from inside ## Do', () => {
  // Failure story: a handoff written only under ## Output reads as a manifest entry rather
  // than an instruction. It becomes the one listed "output" with no producing step, so a
  // model that executes ## Do top to bottom writes its artifacts and ends the turn silently.
  // Weaker models papered over this by reproducing the whole template. Stronger ones parse
  // ## Output as documentation, which it is, and go quiet. auto-verify always carried the
  // form inside ## Do and never went silent. FRAMEWORK.md pins the wire format of the line
  // and names ### Hand Off the conventional shape; this guard pins the load-bearing half:
  // the line is issued from inside ## Do, never from ## Output.
  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    const doStart = source.indexOf('\n## Do\n')
    const doEnd = source.indexOf('\n## Output\n')
    const doSection = source.slice(doStart, doEnd)

    assert.ok(doStart >= 0 && doEnd > doStart, `${skillName} must keep ## Do before ## Output`)
    assert.match(
      doSection,
      /\*\*Next:\*\* |Change status: complete/,
      `${skillName} must issue its handoff from a step inside ## Do, not only describe it under ## Output`
    )
    assert.doesNotMatch(
      source.slice(doEnd),
      /\*\*Next:\*\* |^- Handoff:/m,
      `${skillName} must not restate its handoff under ## Output: one home per contract`
    )
  }

  // One wire format. Prose that merely names a target skill uses plain text, so a
  // routing table can never be mistaken for a line the model should emit.
  for (const entry of readdirSync(skillsRoot, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue
    }
    const file = join(entry.parentPath, entry.name)
    assert.doesNotMatch(
      readFileSync(file, 'utf8'),
      /`Next: /,
      `${file} uses a non-canonical handoff form: FRAMEWORK.md pins **Next:** <skill>, <reason>`
    )
  }
})

test('state-mutating controllers load the artifact lifecycle contract', () => {
  // Scoped to the four controllers that write state. auto-resume was dropped from this
  // list on purpose: it mutates nothing, advances no stage, and takes its routing from
  // references/recovery-scenarios.md, its load order from references/artifact-order.md,
  // and its stale-pointer handling from its own Verify Artifact Integrity step. It was
  // paying an unconditional 1,873-word read for three sentences it already carried, on
  // the one path guaranteed to run with zero warm context.
  for (const skillName of ['auto-frame', 'auto-plan', 'auto-execute', 'auto-verify']) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.match(source, /\.agent\/\.automaton\/references\/ARTIFACT-LIFECYCLE\.md/, `${skillName} must reference the artifact lifecycle contract: controllers that stop citing it re-derive stage handoffs from memory and drift`)
  }

  // The three homes resume relies on instead must keep carrying that weight.
  const resume = readFileSync(join(skillsRoot, 'auto-resume', 'SKILL.md'), 'utf8')
  assert.match(resume, /references\/artifact-order\.md/, 'auto-resume must keep its own load-order home')
  assert.match(resume, /references\/recovery-scenarios\.md/, 'auto-resume must keep its own routing home')
  assert.match(resume, /If any pointer is stale, report it plainly/, 'auto-resume must keep its own stale-pointer handling')
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

test('controller prompts route current state writes through sync-status', () => {
  const directUpdatePattern = /Update `\.agent\/\.automaton\/state\/current\.json`:|Update `current\.json`|`current\.json` updated/

  for (const skillName of authoredSkills) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.doesNotMatch(source, directUpdatePattern, `${skillName} must not instruct direct current.json edits`)
  }

  const expectedStateFlags = {
    'auto-frame': /sync-status\.mjs --active-change "<change>" --canonical-spec/,
    'auto-plan': /sync-status\.mjs --canonical-plan/,
    'auto-execute': /sync-status\.mjs --stage execute/,
    'auto-verify': /sync-status\.mjs --stage verify/,
    'auto-eng-review': /sync-status\.mjs --engineering-review "<verdict>"/
  }

  for (const [skillName, pattern] of Object.entries(expectedStateFlags)) {
    const source = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.match(source, pattern, `${skillName} must call sync-status.mjs with state flags`)
  }

  const framework = readFileSync(join(skillsRoot, '_shared', 'references', 'FRAMEWORK.md'), 'utf8')
  assert.match(framework, /[Nn]ever edit `current\.json` by hand/, 'FRAMEWORK.md must forbid hand-editing current.json')
})

test('retired lifecycle artifacts leave no tolerance prose in shipped skills', () => {
  // Backward compatibility belongs in install code (lib/scaffold.mjs DEPRECATED_STEERING_FILES),
  // never in prompts. Failure story: a shipped file that still names a retired artifact keeps
  // teaching it to the model, so the concept stays generative. The model can look for the
  // artifact, cite it, or produce one, and every invocation pays for a shape that no longer
  // occurs. The scan covers references/ and authoring/ too: a retired artifact taught to a
  // skill author returns to a prompt on the next edit.
  const retired = [/STATUS\.md|Status summary|status summary/, /INTAKE\.md/]

  for (const entry of readdirSync(skillsRoot, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue
    }

    const file = join(entry.parentPath, entry.name)
    const source = readFileSync(file, 'utf8')

    for (const pattern of retired) {
      assert.doesNotMatch(source, pattern, `${file} names a retired artifact: retire the prose, keep legacy handling in install code`)
    }
  }
})

test('prompt references define canonical tags and verification context exception', () => {
  const xml = readFileSync(join(skillsRoot, '_shared', 'authoring', 'XML-CONVENTIONS.md'), 'utf8')
  const contextBudget = readFileSync(join(skillsRoot, '_shared', 'references', 'CONTEXT-BUDGET.md'), 'utf8')
  const execute = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')

  assert.match(xml, /Use the canonical name exactly/)
  assert.match(xml, /Use `<STOP>` for halt conditions/)
  // Checkpoint definitions moved to their single home. XML-CONVENTIONS keeps a pointer only
  // (see artifact-lifecycle.test.mjs for the single-home guard).
  assert.match(xml, /ARTIFACT-LIFECYCLE\.md` \(Checkpoint Semantics\)/)
  assert.match(xml, /`<GATE>`/)
  assert.doesNotMatch(xml, /HARD-GATE/)
  assert.match(contextBudget, /verification pass/)
  assert.match(execute, /<STOP>\n\nHalt immediately/)
  assert.doesNotMatch(execute, /STOP-CONDITIONS/)
})

test('lifecycle skills express handoff in durable-state vocabulary', () => {
  const lifecycleSkills = ['auto-frame', 'auto-plan', 'auto-execute', 'auto-verify', 'auto-resume']

  for (const skillName of lifecycleSkills) {
    const skill = readFileSync(join(skillsRoot, skillName, 'SKILL.md'), 'utf8')

    assert.match(skill, /current\.json|canonical_/, `${skillName} must reference durable state via current.json or canonical pointers`)
    assert.match(skill, /[Rr]ecommend|[Nn]ext handoff|Next:|continue inline|New objective|Change status/, `${skillName} must describe next action, completion, or future objective`)
    assert.match(skill, /\.agent\/(?:work|steering)\/|SPEC\.md|PLAN\.md|DESIGN\.md/, `${skillName} must name an artifact path`)
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

test('auto-frame and auto-plan distinguish core from conditional sections', () => {
  // The doctrine requires lifecycle SKILL.md required-section lists to label every
  // field as core (always present) or conditional (include only when a trigger applies).
  // Match case-insensitively because individual skills may use Title Case for labels.
  const frame = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8') +
    readFileSync(join(skillsRoot, 'auto-frame', 'references', 'spec-shape.md'), 'utf8')
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
  const allowed = new Set(['GATE', 'STOP'])

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

test('installed skill prose avoids the LEXICON prohibited phrases', () => {
  // LEXICON.md (Prohibited Phrases) bans instruction wording too vague to shape behavior.
  // Double-quoted spans are stripped before scanning: quality cards and calibration
  // references quote violations on purpose as anti-pattern examples.
  const prohibited = /\b(consider|as needed|be careful|think about|best practices?)\b/i
  const prosePaths = []

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.md')) {
        prosePaths.push(full)
      }
    }
  }

  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('auto-')) {
      walk(join(skillsRoot, entry.name))
    }
  }
  walk(join(skillsRoot, '_shared', 'references'))

  assert.ok(prosePaths.length > 30, 'prohibited-phrase scan must cover the installed prose surfaces')
  for (const file of prosePaths) {
    const unquoted = readFileSync(file, 'utf8').replaceAll(/"[^"]*"/g, '""')
    const hit = unquoted.match(prohibited)
    assert.equal(hit, null, `${file} uses prohibited phrase "${hit?.[0]}" (LEXICON.md, Prohibited Phrases)`)
  }
})

test('every reference pointer in skills and role sources resolves to a real file', () => {
  // Stale-pointer guard: a `references/X.md` or `.agent/.automaton/references/X.md`
  // mention that resolves to nothing sends an agent on a dead read. This walks every
  // skill entry point, per-skill reference, and role source so the class stays retired.
  const skillDirs = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('auto-'))
    .map((entry) => entry.name)

  const sourcesFor = (skillName) => {
    const dir = join(skillsRoot, skillName)
    const files = [join(dir, 'SKILL.md')]
    for (const sub of ['references', 'role-sources', 'templates']) {
      const subDir = join(dir, sub)
      if (existsSync(subDir)) {
        files.push(...readdirSync(subDir).filter((f) => f.endsWith('.md')).map((f) => join(subDir, f)))
      }
    }
    return files
  }

  for (const skillName of skillDirs) {
    for (const file of sourcesFor(skillName)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/(?<!\.automaton\/)references\/([a-z0-9-]+\.md)/g)) {
        assert.ok(
          existsSync(join(skillsRoot, skillName, 'references', match[1])),
          `${file} points at references/${match[1]} which does not exist`
        )
      }
      for (const match of source.matchAll(/\.agent\/\.automaton\/references\/([A-Z-]+\.md)/g)) {
        assert.ok(
          existsSync(join(skillsRoot, '_shared', 'references', match[1])),
          `${file} points at shared reference ${match[1]} which does not exist`
        )
      }
    }
  }
})
