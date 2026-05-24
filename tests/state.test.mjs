import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadCurrentState, saveCurrentState } from '../lib/state.mjs'
import { loadStatusSummary, saveStatusSummary } from '../lib/status.mjs'

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

test('status summary round-trips through .agent/steering/STATUS.md', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-status-summary-'))
  const target = join(root, '.agent', 'steering', 'STATUS.md')
  const summary = {
    whatIsTrueNow: ['Automaton has a compact sync helper.'],
    nextStep: 'Run the targeted state and CLI checks.',
    openRisks: ['Live host writeback still depends on controller discipline.']
  }

  saveStatusSummary(target, summary)

  assert.equal(
    readFileSync(target, 'utf8'),
    '# Status\n\n## What Is True Now\n\n- Automaton has a compact sync helper.\n\n## Next Step\n\nRun the targeted state and CLI checks.\n\n## Open Risks\n\n- Live host writeback still depends on controller discipline.\n'
  )
  assert.deepEqual(loadStatusSummary(target), summary)
})

test('status parser reads prose summary without cursor fields', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-status-summary-annotated-'))
  const target = join(root, '.agent', 'steering', 'STATUS.md')

  mkdirSync(join(root, '.agent', 'steering'), { recursive: true })
  writeFileSync(
    target,
    [
      '# Status',
      '',
      '## What Is True Now',
      '',
      '- The active frame is summarized without relying on status prose as a path cursor.',
      '',
      '## Next Step',
      '',
      'Read current.json for canonical artifact paths.',
      '',
      '## Open Risks',
      '',
      '- none recorded',
      ''
    ].join('\n'),
    'utf8'
  )

  assert.deepEqual(loadStatusSummary(target), {
    whatIsTrueNow: ['The active frame is summarized without relying on status prose as a path cursor.'],
    nextStep: 'Read current.json for canonical artifact paths.',
    openRisks: []
  })
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
    productReview: 'approved_with_risks',
    engineeringReview: 'needs_correction'
  }

  saveCurrentState(target, state)

  assert.equal(
    readFileSync(target, 'utf8'),
    '{\n  "active_change": "automaton-v1-foundation",\n  "stage": "plan",\n  "canonical_spec": "docs/spec.md",\n  "canonical_plan": "docs/plan.md",\n  "product_review": "approved_with_risks",\n  "engineering_review": "needs_correction"\n}\n'
  )
  assert.deepEqual(loadCurrentState(target), state)
})

test('saveCurrentState accepts durable snake_case review input and loadCurrentState normalizes it', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-state-review-durable-input-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const state = {
    active_change: 'existing-change',
    stage: 'verify',
    product_review: 'approved',
    engineering_review: 'approved_with_risks'
  }

  saveCurrentState(target, state)

  assert.equal(
    readFileSync(target, 'utf8'),
    '{\n  "active_change": "existing-change",\n  "stage": "verify",\n  "product_review": "approved",\n  "engineering_review": "approved_with_risks"\n}\n'
  )
  assert.deepEqual(loadCurrentState(target), {
    activeChange: 'existing-change',
    stage: 'verify',
    productReview: 'approved',
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
    productReview: null,
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
  writeFileSync(join(root, 'docs', 'spec.md'), '# Spec\n', 'utf8')
  writeFileSync(join(root, 'docs', 'plan.md'), '# Plan\n', 'utf8')

  const output = execFileSync(process.execPath, [script, target], { encoding: 'utf8' })

  assert.deepEqual(JSON.parse(output), {
    activeChange: 'existing-change',
    stage: 'execute',
    canonicalSpec: 'docs/spec.md',
    canonicalDesign: null,
    canonicalPlan: 'docs/plan.md',
    productReview: null,
    engineeringReview: 'approved_with_risks',
    custom_flag: true,
    diagnostics: []
  })
})

test('shared sync-status script strips legacy cursor fields while preserving status details', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-shared-status-sync-'))
  const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/sync-status.mjs', import.meta.url))

  mkdirSync(join(root, '.agent', 'steering'), { recursive: true })
  writeFileSync(
    statusTarget,
    [
      '---',
      'active_change: stale-change',
      'stage: frame',
      '---',
      '',
      '# Status',
      '',
      '## Current Change',
      '',
      '- active change: `stale-change`',
      '- current stage: `frame`',
      '- canonical spec: `docs/spec.md`',
      '- canonical plan: `docs/plan.md`',
      '',
      '## What Is True Now',
      '',
      '- Preserve this progress note.',
      '',
      '## Next Step',
      '',
      'Preserve this next step.',
      '',
      '## Open Risks',
      '',
      '- Preserve this risk.',
      ''
    ].join('\n'),
    'utf8'
  )

  const output = execFileSync(process.execPath, [script, root], { encoding: 'utf8' })
  const source = readFileSync(statusTarget, 'utf8')

  assert.deepEqual(JSON.parse(output), {
    synced: true,
    statusPath: statusTarget
  })
  assert.doesNotMatch(source, /## Current Change/)
  assert.doesNotMatch(source, /active change/)
  assert.doesNotMatch(source, /current stage/)
  assert.doesNotMatch(source, /canonical spec/)
  assert.match(source, /^Preserve this next step\.$/m)
  assert.deepEqual(loadStatusSummary(statusTarget), {
    whatIsTrueNow: ['Preserve this progress note.'],
    nextStep: 'Preserve this next step.',
    openRisks: ['Preserve this risk.']
  })
})

test('shared sync-status script creates a parseable status summary when missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-shared-status-missing-'))
  const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/sync-status.mjs', import.meta.url))

  execFileSync(process.execPath, [script, root], { encoding: 'utf8' })

  assert.deepEqual(loadStatusSummary(statusTarget), {
    whatIsTrueNow: [],
    nextStep: 'Run `auto-onboard` to refresh project truth for the repository before continuing.',
    openRisks: []
  })
})
