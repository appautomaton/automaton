import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Runtime behavior: one deterministic walk of the full lifecycle state machine through the
// REAL shared scripts, edge by edge (DD-002, DD-004). This is the executable form of the
// stage table in FRAMEWORK.md and the handoff rows in ARTIFACT-LIFECYCLE.md: frame entry,
// frame with lint feedback, reviews, plan, execute, verify, the gap-fix re-entry,
// the repeated-criterion escalation to plan, and the verified terminal. cli-smoke proves
// the package installs from anywhere; this proves the installed state machine walks. It
// uses a cheap manifest-only scaffold, so keep slow full-tree scenarios out of it.

const getContextPath = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))
const syncStatusPath = fileURLToPath(new URL('../skills/_shared/scripts/sync-status.mjs', import.meta.url))
const manifestSource = fileURLToPath(new URL('../runtime/lib/contracts-data.json', import.meta.url))

const GOOD_SPEC = '# SPEC\n\nBounded goal: walk the lifecycle.\n\n## Acceptance Criteria\n- every edge syncs\n\n## Anti-Goals\n- none\n'
const GAPPY_SPEC = '# SPEC\n\nBounded goal: walk the lifecycle.\n'
const GOOD_PLAN = [
  '# PLAN',
  '',
  '### Slice 1: Walk',
  '',
  '**Objective:** walk every stage edge',
  '**Acceptance criteria:**',
  '- state machine reaches verified',
  '**Verification:** node --test tests/lifecycle-walk.test.mjs',
  ''
].join('\n')

function scaffold() {
  const root = mkdtempSync(join(tmpdir(), 'automaton-walk-'))
  mkdirSync(join(root, '.agent', '.automaton', 'lib'), { recursive: true })
  cpSync(manifestSource, join(root, '.agent', '.automaton', 'lib', 'contracts-data.json'))
  return root
}

function sync(root, flags) {
  const result = spawnSync(process.execPath, [syncStatusPath, root, ...flags], { encoding: 'utf8' })
  return { status: result.status, output: JSON.parse(result.stdout) }
}

function getContext(root) {
  const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')
  const result = spawnSync(process.execPath, [getContextPath, currentPath], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

function expectClean(step, { status, output }) {
  assert.equal(status, 0, `${step}: sync must exit 0`)
  assert.equal(output.synced, true, `${step}: sync must report synced`)
  const errors = (output.diagnostics ?? []).filter((item) => item.level === 'error')
  assert.deepEqual(errors, [], `${step}: no error diagnostics expected`)
  return output
}

test('the full lifecycle walks edge by edge through the real scripts', () => {
  const root = scaffold()
  const change = '2026-06-12-walk'
  const workDir = join(root, '.agent', 'work', change)
  mkdirSync(workDir, { recursive: true })
  const specPath = `.agent/work/${change}/SPEC.md`
  const planPath = `.agent/work/${change}/PLAN.md`

  // frame entry: active change recorded at stage frame.
  expectClean('frame entry', sync(root, ['--active-change', change, '--stage', 'frame']))
  assert.equal(getContext(root).stage, 'frame')

  // frame writes a gappy SPEC: L2 lint warns at write time but never blocks (DD-009).
  writeFileSync(join(root, specPath), GAPPY_SPEC, 'utf8')
  const framed = expectClean('frame with gappy SPEC', sync(root, ['--canonical-spec', specPath, '--stage', 'frame']))
  const frameWarnings = framed.diagnostics.map((item) => item.code)
  assert.ok(frameWarnings.includes('spec_missing_acceptance_criteria'), 'lint must flag the gappy SPEC')

  // frame fixes the SPEC: diagnostics clear on the next read.
  writeFileSync(join(root, specPath), GOOD_SPEC, 'utf8')
  assert.deepEqual(getContext(root).diagnostics, [], 'well-shaped SPEC must read clean')

  // The user approves SPEC.md at frame's exit. There is no product review
  // verdict to sync: the walk proceeds straight to plan.

  // plan: canonical plan recorded, stage advances.
  writeFileSync(join(root, planPath), GOOD_PLAN, 'utf8')
  expectClean('plan', sync(root, ['--canonical-plan', planPath, '--stage', 'plan']))
  writeFileSync(join(root, planPath), `${GOOD_PLAN}\n## Review: Engineering\n\nVerdict: approved\n`, 'utf8')
  expectClean('engineering review', sync(root, ['--engineering-review', 'approved']))

  // execute, then verify.
  expectClean('execute', sync(root, ['--stage', 'execute']))
  expectClean('verify', sync(root, ['--stage', 'verify']))

  // verify FAIL: state returns to execute for gap-fix re-entry, then verify runs again.
  expectClean('gap-fix re-entry', sync(root, ['--stage', 'execute']))
  expectClean('re-verify', sync(root, ['--stage', 'verify']))

  // repeated criterion failure: escalation returns to plan (lifecycle Stage Handoffs row).
  expectClean('escalation to plan', sync(root, ['--stage', 'plan']))

  // re-plan walks forward to the terminal pass.
  expectClean('execute after re-plan', sync(root, ['--stage', 'execute']))
  expectClean('final verify', sync(root, ['--stage', 'verify']))
  expectClean('verified terminal', sync(root, ['--stage', 'verified']))

  const final = getContext(root)
  assert.equal(final.stage, 'verified')
  assert.equal(final.activeChange, change)
  assert.equal(final.canonicalSpec, specPath)
  assert.equal(final.canonicalPlan, planPath)
  assert.equal(final.engineeringReview, 'approved')
  assert.deepEqual(final.diagnostics, [])

  // The durable file stays snake_case for cross-host portability (DD-002).
  const durable = readFileSync(join(root, '.agent', '.automaton', 'state', 'current.json'), 'utf8')
  assert.match(durable, /"active_change": "2026-06-12-walk"/)
  assert.match(durable, /"stage": "verified"/)
})

// A verdict describes the plan content it reviewed (ARTIFACT-LIFECYCLE.md, Review
// Verdict Routing). Failure story: a re-plan rewrites the same PLAN.md path, so a
// path-keyed clear let needs_correction survive the re-sync, and execute's entry
// gate bounced the change between plan and execute with no exit.
test('a plan re-sync clears the standing verdict so a re-plan is not deadlocked', () => {
  const root = scaffold()
  const change = '2026-07-14-replan'
  const workDir = join(root, '.agent', 'work', change)
  mkdirSync(workDir, { recursive: true })
  const specPath = `.agent/work/${change}/SPEC.md`
  const planPath = `.agent/work/${change}/PLAN.md`
  writeFileSync(join(root, specPath), GOOD_SPEC, 'utf8')
  writeFileSync(join(root, planPath), GOOD_PLAN, 'utf8')

  expectClean('seed', sync(root, ['--active-change', change, '--canonical-spec', specPath, '--stage', 'frame']))
  expectClean('plan', sync(root, ['--canonical-plan', planPath, '--stage', 'plan']))
  expectClean('review rejects', sync(root, ['--engineering-review', 'needs_correction']))
  assert.equal(getContext(root).engineeringReview, 'needs_correction')

  expectClean('re-plan same path', sync(root, ['--canonical-plan', planPath, '--stage', 'plan']))
  assert.equal(getContext(root).engineeringReview, null, 'a re-synced plan must clear the standing verdict, or execute deadlocks on needs_correction')
  expectClean('execute after re-plan', sync(root, ['--stage', 'execute']))
})

test('the walk is guarded: invalid stages block and a change switch clears derived state', () => {
  const root = scaffold()
  const change = '2026-06-12-walk-guards'
  const workDir = join(root, '.agent', 'work', change)
  mkdirSync(workDir, { recursive: true })
  const specPath = `.agent/work/${change}/SPEC.md`
  const planPath = `.agent/work/${change}/PLAN.md`
  writeFileSync(join(root, specPath), GOOD_SPEC, 'utf8')
  writeFileSync(join(root, planPath), GOOD_PLAN, 'utf8')

  expectClean('seed', sync(root, ['--active-change', change, '--canonical-spec', specPath, '--stage', 'frame']))
  expectClean('seed plan', sync(root, ['--canonical-plan', planPath, '--stage', 'plan']))
  expectClean('seed reviews', sync(root, ['--engineering-review', 'approved']))

  // L1 blocks an invalid stage with an error diagnostic and a non-zero exit (DD-004).
  const invalid = sync(root, ['--stage', 'bogus'])
  assert.equal(invalid.status, 1, 'invalid stage must exit non-zero')
  assert.equal(invalid.output.synced, false)
  assert.ok(invalid.output.diagnostics.some((item) => item.code === 'invalid_stage' && item.level === 'error'))
  assert.equal(getContext(root).stage, 'plan', 'a blocked sync must not change durable state')

  // Switching the active change clears canonical pointers and review verdicts: stale
  // pointers from the previous change must never leak into the next one (applyStatePatch).
  expectClean('change switch', sync(root, ['--active-change', '2026-06-13-next', '--stage', 'frame']))
  const next = getContext(root)
  assert.equal(next.activeChange, '2026-06-13-next')
  assert.equal(next.canonicalSpec, null)
  assert.equal(next.canonicalPlan, null)
  assert.equal(next.engineeringReview, null)
})
