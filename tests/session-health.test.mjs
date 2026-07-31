// Session-hook health surface: the facts the harness knows and the user cannot see.
// Failure story: the hook is the only Automaton surface a user gets without asking, and
// for a long time it emitted static vocabulary only. A project could carry unresolvable
// pointers, an install that cannot prune itself, and a change that finished weeks ago
// without advancing, and every session opened silent.
// The paired guard is the quiet path: a healthy project must emit no attention block,
// or the block becomes noise the reader learns to skip.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSessionContext, sessionHealthFindings } from '../runtime/lib/context.mjs'
import { installProject } from '../lib/install.mjs'

const sourceRoot = fileURLToPath(new URL('..', import.meta.url))

const HEALTHY_PLAN = `# Plan

### Slice 1: First
**Objective:** do the thing
**Status:** complete

### Slice 2: Second
**Objective:** do the next thing
`

const PARKED_PLAN = `# Plan

### Slice 1: First
**Objective:** do the thing
**Status:** complete

### Slice 2: Second
**Objective:** do the next thing
**Status:** prep complete; publish held (human-action checkpoint)
`

function healthyProject(label) {
  const root = mkdtempSync(join(tmpdir(), `automaton-health-${label}-`))
  installProject(root, { sourceRoot })

  mkdirSync(join(root, '.agent', 'work', 'a-change'), { recursive: true })
  writeFileSync(join(root, '.agent', 'work', 'a-change', 'SPEC.md'), '# SPEC\n', 'utf8')

  return root
}

function stateFor(stage, plan = null) {
  return {
    activeChange: 'a-change',
    stage,
    canonicalSpec: '.agent/work/a-change/SPEC.md',
    canonicalPlan: plan,
    canonicalDesign: null,
    engineeringReview: null
  }
}

test('a healthy project emits no attention block', () => {
  const root = healthyProject('quiet')
  writeFileSync(join(root, '.agent', 'work', 'a-change', 'PLAN.md'), HEALTHY_PLAN, 'utf8')

  const state = stateFor('execute', '.agent/work/a-change/PLAN.md')
  assert.deepEqual(sessionHealthFindings(root, state), [])
  assert.doesNotMatch(buildSessionContext(root), /Needs attention/)
})

test('a plan whose every slice reports status at an unadvanced stage is reported as parked', () => {
  const root = healthyProject('parked')
  writeFileSync(join(root, '.agent', 'work', 'a-change', 'PLAN.md'), PARKED_PLAN, 'utf8')

  const findings = sessionHealthFindings(root, stateFor('execute', '.agent/work/a-change/PLAN.md'))

  assert.equal(findings.length, 1)
  assert.match(findings[0], /all 2 slices .* report status and none are blocked, but the stage is still execute/)
})

test('a blocked slice is in-flight work, not a parked change', () => {
  const root = healthyProject('blocked')
  writeFileSync(
    join(root, '.agent', 'work', 'a-change', 'PLAN.md'),
    PARKED_PLAN.replace('**Status:** prep complete; publish held (human-action checkpoint)', '**Status:** blocked'),
    'utf8'
  )

  assert.deepEqual(sessionHealthFindings(root, stateFor('execute', '.agent/work/a-change/PLAN.md')), [])
})

test('stages before execute are never reported as parked', () => {
  const root = healthyProject('early')
  writeFileSync(join(root, '.agent', 'work', 'a-change', 'PLAN.md'), PARKED_PLAN, 'utf8')

  assert.deepEqual(sessionHealthFindings(root, stateFor('plan', '.agent/work/a-change/PLAN.md')), [])
})

// The placeholder-steering check retired with auto-onboard (DD-016). ROADMAP.md is
// the only steering file and "No active roadmap" is a legitimate steady state, so a
// fresh install with nothing written yet must open silent.
test('a fresh install with untouched steering reports nothing', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-health-steering-'))
  installProject(root, { sourceRoot })

  assert.deepEqual(sessionHealthFindings(root, null), [])
})

test('a receiptless install reports that upgrades cannot prune', () => {
  const root = healthyProject('receipt')
  writeFileSync(join(root, '.agent', 'work', 'a-change', 'PLAN.md'), HEALTHY_PLAN, 'utf8')
  // Simulate the pre-receipt installs still in the field: everything else is healthy.
  rmSync(join(root, '.agent', '.automaton', 'state', 'install-manifest.json'), { force: true })

  const findings = sessionHealthFindings(root, stateFor('execute', '.agent/work/a-change/PLAN.md'))

  assert.equal(findings.length, 1)
  assert.match(findings[0], /no install receipt: this install predates receipt tracking/)
})

test('unresolvable canonical pointers surface as state findings', () => {
  const root = healthyProject('stale')

  const findings = sessionHealthFindings(root, {
    ...stateFor('plan', '.agent/work/a-change/PLAN.md'),
    canonicalSpec: '.agent/work/a-change/GONE.md'
  })

  assert.ok(findings.some((finding) => /canonicalSpec points to .* but file does not exist/.test(finding)))
})

test('a disengaged harness opens quiet, and the health channel stays live', () => {
  const root = healthyProject('disengaged')
  writeFileSync(join(root, '.agent', 'work', 'a-change', 'PLAN.md'), HEALTHY_PLAN, 'utf8')
  const statePath = join(root, '.agent', '.automaton', 'state', 'current.json')
  const writeState = (spec) => writeFileSync(statePath, JSON.stringify({
    active_change: 'a-change',
    stage: 'verified',
    canonical_spec: spec,
    canonical_plan: '.agent/work/a-change/PLAN.md',
    disengaged: true
  }, null, 2), 'utf8')

  writeState('.agent/work/a-change/SPEC.md')
  const quiet = buildSessionContext(root)
  assert.match(quiet, /verified and the harness is disengaged until your next objective/)
  assert.doesNotMatch(quiet, /read all of .*FRAMEWORK\.md/)
  assert.doesNotMatch(quiet, /Needs attention/)

  // Disengagement is quiet, not blind: a stale pointer still surfaces.
  writeState('.agent/work/a-change/GONE.md')
  assert.match(buildSessionContext(root), /Needs attention/)
})

// The engagement criterion is the harness's entry gate, and the hook is the only
// surface a model reads before deciding to load a skill. A gate written inside a
// SKILL.md costs the load it exists to avoid, so this guard pins it to the hook.
// It is asserted in both states on purpose: disengaged is precisely the moment a
// new objective arrives and the gate has to answer.
test('the engagement criterion reaches the model in both engaged and disengaged states', () => {
  const root = healthyProject('criterion')
  writeFileSync(join(root, '.agent', 'work', 'a-change', 'PLAN.md'), HEALTHY_PLAN, 'utf8')
  const statePath = join(root, '.agent', '.automaton', 'state', 'current.json')

  const criterion = /survive a context boundary or when the outcome needs agreement before it is built/
  const offRamp = /one session can finish and verify does not need it: do that work directly/

  assert.match(buildSessionContext(root), criterion)
  assert.match(buildSessionContext(root), offRamp)

  writeFileSync(statePath, JSON.stringify({
    active_change: 'a-change',
    stage: 'verified',
    canonical_spec: '.agent/work/a-change/SPEC.md',
    canonical_plan: '.agent/work/a-change/PLAN.md',
    disengaged: true
  }, null, 2), 'utf8')

  assert.match(buildSessionContext(root), criterion)
  assert.match(buildSessionContext(root), offRamp)
})

// Failure story this prevents: deferring the FRAMEWORK.md read from session start
// to first stage action is safe, but only as a whole-file read. No SKILL.md ever
// instructs reading that file. Every reference in the skill tree names a section
// and assumes the whole file is loaded, while Stages and Handoff Model carry no
// inline pointer at all. Frame's working set is FRAMEWORK.md plus
// SKILL.md and nothing else, so a section-wise reminder would strip the
// `**Next:**` handoff format out of frame with no test failing.
test('the reminder asks for FRAMEWORK.md whole, never by section', () => {
  const root = healthyProject('wholefile')
  const reminder = buildSessionContext(root)

  assert.match(reminder, /read all of \.agent\/\.automaton\/references\/FRAMEWORK\.md once/)

  const framework = readFileSync(join(root, '.agent', '.automaton', 'references', 'FRAMEWORK.md'), 'utf8')
  const sections = [...framework.matchAll(/^## (.+)$/gm)].map((match) => match[1].trim())

  assert.ok(sections.length >= 5, 'FRAMEWORK.md should expose the sections this guard scans')
  for (const section of sections) {
    assert.ok(
      !reminder.includes(section),
      `the reminder names the FRAMEWORK.md section "${section}": a section-wise read drops the sections no SKILL.md points at`
    )
  }
})
