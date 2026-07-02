// Runtime behavior: current.json round-trips, normalization, shared-script state writes (DD-002, DD-007).
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadCurrentState, saveCurrentState } from '../lib/state.mjs'

// Well-shaped artifact fixtures: these tests assert exact-empty diagnostics, so the
// fixtures must satisfy the L2 artifact lint as well as the L1 pointer checks.
const LINT_CLEAN_SPEC = '# Spec\n\n## Acceptance Criteria\n- check passes\n\n## Anti-Goals\n- none\n'
const LINT_CLEAN_PLAN = [
  '# Plan',
  '',
  '### Slice 1: Do the thing',
  '',
  '**Objective:** do the thing',
  '**Acceptance criteria:**',
  '- thing observable',
  '**Verification:** node --test',
  ''
].join('\n')

test('current state round-trips through .agent/.automaton/state/current.json', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const state = { activeChange: 'automaton-v1-foundation', stage: 'plan' }

  saveCurrentState(target, state)
  assert.deepEqual(loadCurrentState(target), state)
  assert.equal(
    readFileSync(target, 'utf8'),
    '{\n  "active_change": "automaton-v1-foundation",\n  "stage": "plan"\n}\n'
  )
})

test('saveCurrentState writes durable snake_case keys and loadCurrentState normalizes them', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-shape-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const state = {
    activeChange: 'automaton-v1-foundation',
    stage: 'plan',
    canonicalSpec: 'docs/spec.md',
    canonicalDesign: 'docs/design.md',
    canonicalPlan: 'docs/plan.md'
  }

  saveCurrentState(target, state)

  assert.equal(
    readFileSync(target, 'utf8'),
    '{\n  "active_change": "automaton-v1-foundation",\n  "stage": "plan",\n  "canonical_spec": "docs/spec.md",\n  "canonical_design": "docs/design.md",\n  "canonical_plan": "docs/plan.md"\n}\n'
  )
  assert.deepEqual(loadCurrentState(target), state)
})

test('saveCurrentState accepts durable snake_case input and loadCurrentState normalizes it', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-durable-input-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const state = {
    active_change: 'existing-change',
    stage: 'verify',
    canonical_spec: 'docs/spec.md',
    canonical_design: 'docs/design.md',
    canonical_plan: 'docs/plan.md'
  }

  saveCurrentState(target, state)

  assert.equal(
    readFileSync(target, 'utf8'),
    '{\n  "active_change": "existing-change",\n  "stage": "verify",\n  "canonical_spec": "docs/spec.md",\n  "canonical_design": "docs/design.md",\n  "canonical_plan": "docs/plan.md"\n}\n'
  )
  assert.deepEqual(loadCurrentState(target), {
    activeChange: 'existing-change',
    stage: 'verify',
    canonicalSpec: 'docs/spec.md',
    canonicalDesign: 'docs/design.md',
    canonicalPlan: 'docs/plan.md'
  })
})

test('loadCurrentState normalizes durable snake_case state from disk', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-load-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')

  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(
    target,
    '{\n  "active_change": "existing-change",\n  "stage": "verify",\n  "canonical_spec": "docs/spec.md",\n  "canonical_design": "docs/design.md",\n  "canonical_plan": "docs/plan.md"\n}\n',
    'utf8'
  )

  assert.deepEqual(loadCurrentState(target), {
    activeChange: 'existing-change',
    stage: 'verify',
    canonicalSpec: 'docs/spec.md',
    canonicalDesign: 'docs/design.md',
    canonicalPlan: 'docs/plan.md'
  })
})

test('saveCurrentState rejects invalid stage values on write', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-invalid-stage-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')

  assert.throws(
    () => saveCurrentState(target, { activeChange: 'existing-change', stage: 'work' }),
    /invalid stage: work/
  )
})

test('loadCurrentState rejects invalid stage values on read', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-invalid-stage-read-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')

  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(
    target,
    '{\n  "active_change": "existing-change",\n  "stage": "work"\n}\n',
    'utf8'
  )

  assert.throws(() => loadCurrentState(target), /invalid stage: work/)
})

test('saveCurrentState rejects missing active change on write', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-missing-active-write-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')

  assert.throws(
    () => saveCurrentState(target, { stage: 'plan' }),
    /invalid current state: missing active change/
  )
})

test('loadCurrentState rejects missing active change from disk', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-missing-active-read-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')

  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(target, '{\n  "stage": "plan"\n}\n', 'utf8')

  assert.throws(() => loadCurrentState(target), /invalid current state: missing active change/)
})


test('saveCurrentState writes durable snake_case review keys and loadCurrentState normalizes them', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-review-keys-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const state = {
    activeChange: 'automaton-v1-foundation',
    stage: 'plan',
    canonicalSpec: 'docs/spec.md',
    canonicalPlan: 'docs/plan.md',
    engineeringReview: 'needs_correction'
  }

  saveCurrentState(target, state)

  assert.equal(
    readFileSync(target, 'utf8'),
    '{\n  "active_change": "automaton-v1-foundation",\n  "stage": "plan",\n  "canonical_spec": "docs/spec.md",\n  "canonical_plan": "docs/plan.md",\n  "engineering_review": "needs_correction"\n}\n'
  )
  assert.deepEqual(loadCurrentState(target), state)
})

// Migration guard: projects installed before the product review removal may carry a
// product_review field in current.json. The loader must tolerate it as an inert unknown
// key (no error, no data loss to other fields) so upgrade never bricks recovery.
test('legacy product_review field loads and round-trips as an inert unknown key', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-legacy-product-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')

  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(
    target,
    '{\n  "active_change": "pre-upgrade-change",\n  "stage": "plan",\n  "canonical_spec": "docs/spec.md",\n  "product_review": "approved",\n  "engineering_review": "approved"\n}\n',
    'utf8'
  )

  const loaded = loadCurrentState(target)
  assert.equal(loaded.activeChange, 'pre-upgrade-change')
  assert.equal(loaded.engineeringReview, 'approved')
  assert.equal(loaded.product_review, 'approved', 'legacy key must survive verbatim, not normalize')

  saveCurrentState(target, loaded)
  const reloaded = loadCurrentState(target)
  assert.equal(reloaded.product_review, 'approved')
  assert.equal(reloaded.engineeringReview, 'approved')
})

test('saveCurrentState accepts durable snake_case review input and loadCurrentState normalizes it', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-review-durable-input-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const state = {
    active_change: 'existing-change',
    stage: 'verify',
    engineering_review: 'approved_with_risks'
  }

  saveCurrentState(target, state)

  assert.equal(
    readFileSync(target, 'utf8'),
    '{\n  "active_change": "existing-change",\n  "stage": "verify",\n  "engineering_review": "approved_with_risks"\n}\n'
  )
  assert.deepEqual(loadCurrentState(target), {
    activeChange: 'existing-change',
    stage: 'verify',
    engineeringReview: 'approved_with_risks'
  })
})

test('shared get-context script returns deterministic camelCase JSON when state is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-shared-context-missing-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  const output = execFileSync(process.execPath, [script, target], { encoding: 'utf8' })

  assert.deepEqual(JSON.parse(output), {
    activeChange: 'none',
    stage: 'none',
    canonicalSpec: null,
    canonicalDesign: null,
    canonicalPlan: null,
    engineeringReview: null,
    diagnostics: []
  })
})

test('shared get-context script normalizes durable state and preserves extra keys', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-shared-context-normalize-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  saveCurrentState(target, {
    activeChange: 'existing-change',
    stage: 'execute',
    canonicalSpec: 'docs/spec.md',
    canonicalPlan: 'docs/plan.md',
    engineeringReview: 'approved_with_risks',
    custom_flag: true
  })
  mkdirSync(join(root, 'docs'), { recursive: true })
  writeFileSync(join(root, 'docs', 'spec.md'), LINT_CLEAN_SPEC, 'utf8')
  // The verdict in state needs its section on the artifact or lint warns.
  writeFileSync(join(root, 'docs', 'plan.md'), `${LINT_CLEAN_PLAN}\n## Review: Engineering\n\nVerdict: approved_with_risks\n`, 'utf8')

  const output = execFileSync(process.execPath, [script, target], { encoding: 'utf8' })

  assert.deepEqual(JSON.parse(output), {
    activeChange: 'existing-change',
    stage: 'execute',
    canonicalSpec: 'docs/spec.md',
    canonicalDesign: null,
    canonicalPlan: 'docs/plan.md',
    engineeringReview: 'approved_with_risks',
    custom_flag: true,
    diagnostics: []
  })
})

test('shared sync-status script is a no-op without state flags', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-shared-state-noop-'))
  const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/sync-status.mjs', import.meta.url))

  mkdirSync(join(root, '.agent', 'steering'), { recursive: true })
  writeFileSync(statusTarget, '# Status\n\nLegacy note that should not be normalized.\n', 'utf8')

  const output = JSON.parse(execFileSync(process.execPath, [script, root], { encoding: 'utf8' }))

  assert.deepEqual(output, {
    synced: true,
    statePath: join(root, '.agent', '.automaton', 'state', 'current.json')
  })
  assert.equal(readFileSync(statusTarget, 'utf8'), '# Status\n\nLegacy note that should not be normalized.\n')
})

test('shared sync-status script does not create STATUS.md when missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-shared-status-absent-'))
  const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/sync-status.mjs', import.meta.url))

  execFileSync(process.execPath, [script, root], { encoding: 'utf8' })

  assert.equal(existsSync(statusTarget), false)
})

test('shared sync-status script updates current state through validated flags', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-shared-state-sync-'))
  const script = fileURLToPath(new URL('../skills/_shared/scripts/sync-status.mjs', import.meta.url))
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')
  const specPath = '.agent/work/my-change/SPEC.md'
  const planPath = '.agent/work/my-change/PLAN.md'

  mkdirSync(join(root, '.agent', 'work', 'my-change'), { recursive: true })
  writeFileSync(join(root, specPath), LINT_CLEAN_SPEC, 'utf8')
  writeFileSync(join(root, planPath), LINT_CLEAN_PLAN, 'utf8')

  const frameOutput = JSON.parse(execFileSync(process.execPath, [
    script,
    root,
    '--active-change',
    'my-change',
    '--canonical-spec',
    specPath,
    '--stage',
    'frame'
  ], { encoding: 'utf8' }))

  assert.equal(frameOutput.synced, true)
  assert.equal(frameOutput.stateChanged, true)
  assert.deepEqual(frameOutput.changed, ['active_change', 'canonical_spec', 'stage'])
  assert.deepEqual(frameOutput.diagnostics, [])
  assert.deepEqual(loadCurrentState(currentTarget), {
    activeChange: 'my-change',
    canonicalSpec: specPath,
    stage: 'frame'
  })

  execFileSync(process.execPath, [
    script,
    root,
    '--canonical-plan',
    planPath,
    '--stage',
    'plan'
  ], { encoding: 'utf8' })

  assert.deepEqual(loadCurrentState(currentTarget), {
    activeChange: 'my-change',
    canonicalSpec: specPath,
    canonicalPlan: planPath,
    stage: 'plan'
  })
})

test('shared sync-status script rejects invalid state updates without writing current state', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-shared-state-reject-'))
  const script = fileURLToPath(new URL('../skills/_shared/scripts/sync-status.mjs', import.meta.url))
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')

  const result = spawnSync(process.execPath, [script, root, '--stage', 'plan'], { encoding: 'utf8' })
  const output = JSON.parse(result.stdout)

  assert.equal(result.status, 1)
  assert.equal(output.synced, false)
  assert.ok(output.diagnostics.some((item) => item.code === 'missing_active_change'))
  assert.ok(output.diagnostics.some((item) => item.code === 'missing_canonical_spec'))
  assert.equal(existsSync(currentTarget), false)
})

test('shared sync-status script resets change-scoped state when active change changes', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-shared-state-reset-'))
  const script = fileURLToPath(new URL('../skills/_shared/scripts/sync-status.mjs', import.meta.url))
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')

  saveCurrentState(currentTarget, {
    activeChange: 'old-change',
    stage: 'verify',
    canonicalSpec: '.agent/work/old-change/SPEC.md',
    canonicalPlan: '.agent/work/old-change/PLAN.md',
    engineeringReview: 'approved'
  })

  execFileSync(process.execPath, [
    script,
    root,
    '--active-change',
    'new-change',
    '--stage',
    'frame'
  ], { encoding: 'utf8' })

  assert.deepEqual(loadCurrentState(currentTarget), {
    activeChange: 'new-change',
    stage: 'frame'
  })
})
