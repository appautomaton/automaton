import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { saveCurrentState } from '../lib/state.mjs'
import { validateState, validateArtifacts, validateHandoff } from '../lib/validate.mjs'

test('validateState returns no diagnostics for valid frame state', () => {
  const result = validateState({ activeChange: 'my-change', stage: 'frame' })

  assert.equal(result.valid, true)
  assert.deepEqual(result.diagnostics, [])
})

test('validateState returns no diagnostics for valid plan state with canonicalSpec', () => {
  const result = validateState({
    activeChange: 'my-change',
    stage: 'plan',
    canonicalSpec: '.agent/work/my-change/SPEC.md'
  })

  assert.equal(result.valid, true)
  assert.deepEqual(result.diagnostics, [])
})

test('validateState returns error when plan stage is missing canonicalSpec', () => {
  const result = validateState({ activeChange: 'my-change', stage: 'plan' })

  assert.equal(result.valid, false)
  assert.equal(result.diagnostics.length, 1)
  assert.equal(result.diagnostics[0].level, 'error')
  assert.equal(result.diagnostics[0].code, 'missing_canonical_spec')
  assert.match(result.diagnostics[0].message, /plan stage requires canonicalSpec/)
})

test('validateState returns error when execute stage is missing canonicalPlan', () => {
  const result = validateState({
    activeChange: 'my-change',
    stage: 'execute',
    canonicalSpec: '.agent/work/my-change/SPEC.md'
  })

  assert.equal(result.valid, false)
  assert.equal(result.diagnostics.length, 1)
  assert.equal(result.diagnostics[0].code, 'missing_canonical_plan')
})

test('validateState returns error when verify stage is missing canonicalPlan', () => {
  const result = validateState({ activeChange: 'my-change', stage: 'verify' })

  assert.equal(result.valid, false)
  assert.equal(result.diagnostics[0].code, 'missing_canonical_plan')
})

test('validateState returns no diagnostics for resume stage without canonical pointers', () => {
  const result = validateState({ activeChange: 'my-change', stage: 'resume' })

  assert.equal(result.valid, true)
  assert.deepEqual(result.diagnostics, [])
})

test('validateState rejects invalid stage', () => {
  const result = validateState({ activeChange: 'my-change', stage: 'work' })

  assert.equal(result.valid, false)
  assert.equal(result.diagnostics[0].code, 'invalid_stage')
})

test('validateState reports missing active change', () => {
  const result = validateState({ stage: 'frame' })

  assert.equal(result.valid, false)
  assert.equal(result.diagnostics[0].code, 'missing_active_change')
})

test('validateState accepts valid product review verdicts', () => {
  for (const verdict of ['approved', 'approved_with_risks', 'needs_clarification', 'descoped']) {
    const result = validateState({ activeChange: 'x', stage: 'frame', productReview: verdict })
    assert.equal(result.diagnostics.filter(d => d.code === 'invalid_product_review').length, 0)
  }
})

test('validateState rejects invalid product review verdict', () => {
  const result = validateState({ activeChange: 'x', stage: 'frame', productReview: 'good' })

  assert.equal(result.valid, false)
  assert.equal(result.diagnostics[0].code, 'invalid_product_review')
  assert.match(result.diagnostics[0].message, /good/)
})

test('validateState accepts valid engineering review verdicts', () => {
  for (const verdict of ['approved', 'approved_with_risks', 'needs_correction']) {
    const result = validateState({ activeChange: 'x', stage: 'frame', engineeringReview: verdict })
    assert.equal(result.diagnostics.filter(d => d.code === 'invalid_engineering_review').length, 0)
  }
})

test('validateState rejects invalid engineering review verdict', () => {
  const result = validateState({ activeChange: 'x', stage: 'frame', engineeringReview: 'pass' })

  assert.equal(result.valid, false)
  assert.equal(result.diagnostics[0].code, 'invalid_engineering_review')
})

test('validateArtifacts returns error when canonicalSpec points to missing file', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-artifacts-'))

  const diagnostics = validateArtifacts({
    canonicalSpec: '.agent/work/x/SPEC.md',
    canonicalPlan: null,
    canonicalDesign: null
  }, root)

  assert.equal(diagnostics.length, 1)
  assert.equal(diagnostics[0].level, 'error')
  assert.equal(diagnostics[0].code, 'stale_canonical_spec')
})

test('validateArtifacts returns error when canonicalPlan points to missing file', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-artifacts-'))

  const diagnostics = validateArtifacts({
    canonicalSpec: null,
    canonicalPlan: '.agent/work/x/PLAN.md',
    canonicalDesign: null
  }, root)

  assert.equal(diagnostics.length, 1)
  assert.equal(diagnostics[0].level, 'error')
  assert.equal(diagnostics[0].code, 'stale_canonical_plan')
})

test('validateArtifacts returns warning for stale canonicalDesign', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-artifacts-'))

  const diagnostics = validateArtifacts({
    canonicalSpec: null,
    canonicalPlan: null,
    canonicalDesign: '.agent/work/x/DESIGN.md'
  }, root)

  assert.equal(diagnostics.length, 1)
  assert.equal(diagnostics[0].level, 'warning')
  assert.equal(diagnostics[0].code, 'stale_canonical_design')
})

test('validateArtifacts returns no diagnostics when pointer files exist', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-artifacts-'))
  const specPath = join(root, '.agent', 'work', 'x', 'SPEC.md')
  mkdirSync(join(root, '.agent', 'work', 'x'), { recursive: true })
  writeFileSync(specPath, '# Spec\n', 'utf8')

  const diagnostics = validateArtifacts({
    canonicalSpec: '.agent/work/x/SPEC.md',
    canonicalPlan: null,
    canonicalDesign: null
  }, root)

  assert.deepEqual(diagnostics, [])
})

test('validateHandoff combines state and artifact checks', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-handoff-'))

  const result = validateHandoff({
    activeChange: 'my-change',
    stage: 'plan',
    canonicalSpec: '.agent/work/my-change/SPEC.md'
  }, root)

  assert.equal(result.valid, false)
  const codes = result.diagnostics.map(d => d.code)
  assert.ok(codes.includes('stale_canonical_spec'))
})

test('validateHandoff reports valid when all checks pass', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-handoff-'))
  const specPath = join(root, '.agent', 'work', 'my-change', 'SPEC.md')
  mkdirSync(join(root, '.agent', 'work', 'my-change'), { recursive: true })
  writeFileSync(specPath, '# Spec\n', 'utf8')

  const result = validateHandoff({
    activeChange: 'my-change',
    stage: 'plan',
    canonicalSpec: '.agent/work/my-change/SPEC.md'
  }, root)

  assert.equal(result.valid, true)
  assert.deepEqual(result.diagnostics, [])
})

test('validateHandoff skips artifact checks when stage is invalid', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-handoff-'))

  const result = validateHandoff({
    activeChange: 'my-change',
    stage: 'bogus',
    canonicalSpec: '.agent/work/my-change/SPEC.md'
  }, root)

  assert.equal(result.valid, false)
  assert.equal(result.diagnostics.length, 1)
  assert.equal(result.diagnostics[0].code, 'invalid_stage')
})

test('get-context script includes empty diagnostics when state is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-context-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  const output = execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  const parsed = JSON.parse(output)

  assert.deepEqual(parsed.diagnostics, [])
})

test('get-context script includes empty diagnostics for valid state', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-context-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  saveCurrentState(target, { activeChange: 'my-change', stage: 'frame' })

  const output = execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  const parsed = JSON.parse(output)

  assert.deepEqual(parsed.diagnostics, [])
})

test('get-context script reports missing prerequisite', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-context-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  saveCurrentState(target, { activeChange: 'my-change', stage: 'plan' })

  const output = execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  const parsed = JSON.parse(output)

  assert.ok(parsed.diagnostics.length > 0)
  assert.equal(parsed.diagnostics[0].code, 'missing_canonical_spec')
})

test('get-context script reports stale canonical pointer', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-context-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  saveCurrentState(target, {
    activeChange: 'my-change',
    stage: 'plan',
    canonicalSpec: '.agent/work/my-change/SPEC.md'
  })

  const output = execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  const parsed = JSON.parse(output)

  const staleDiag = parsed.diagnostics.find(d => d.code === 'stale_canonical_spec')
  assert.ok(staleDiag)
  assert.equal(staleDiag.level, 'error')
})

test('get-context script reports invalid review verdict', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-context-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  saveCurrentState(target, {
    activeChange: 'my-change',
    stage: 'frame',
    productReview: 'thumbs_up'
  })

  const output = execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  const parsed = JSON.parse(output)

  const verdictDiag = parsed.diagnostics.find(d => d.code === 'invalid_product_review')
  assert.ok(verdictDiag)
  assert.match(verdictDiag.message, /thumbs_up/)
})

test('automaton validate command reports valid state', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-cli-'))
  const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))

  saveCurrentState(join(root, '.agent', '.automaton', 'state', 'current.json'), {
    activeChange: 'my-change',
    stage: 'frame'
  })

  const result = JSON.parse(
    execFileSync(process.execPath, [cliPath, 'validate', root], { encoding: 'utf8' })
  )

  assert.equal(result.valid, true)
  assert.deepEqual(result.diagnostics, [])
})

test('automaton validate command reports missing canonical prerequisite and exits 1', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-cli-'))
  const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))

  saveCurrentState(join(root, '.agent', '.automaton', 'state', 'current.json'), {
    activeChange: 'my-change',
    stage: 'execute'
  })

  const proc = spawnSync(process.execPath, [cliPath, 'validate', root], { encoding: 'utf8' })
  const result = JSON.parse(proc.stdout)

  assert.equal(proc.status, 1)
  assert.equal(result.valid, false)
  assert.ok(result.diagnostics.some(d => d.code === 'missing_canonical_plan'))
})

test('automaton validate command reports no_state when current.json is missing and exits 1', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-cli-'))
  const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))

  const proc = spawnSync(process.execPath, [cliPath, 'validate', root], { encoding: 'utf8' })
  const result = JSON.parse(proc.stdout)

  assert.equal(proc.status, 1)
  assert.equal(result.valid, false)
  assert.equal(result.diagnostics[0].code, 'no_state')
})

test('automaton validate command handles invalid stage gracefully instead of crashing', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-cli-'))
  const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))
  const stateDir = join(root, '.agent', '.automaton', 'state')

  mkdirSync(stateDir, { recursive: true })
  writeFileSync(join(stateDir, 'current.json'), JSON.stringify({ active_change: 'x', stage: 'bogus' }), 'utf8')

  const proc = spawnSync(process.execPath, [cliPath, 'validate', root], { encoding: 'utf8' })
  const result = JSON.parse(proc.stdout)

  assert.equal(proc.status, 1)
  assert.equal(proc.stderr, '')
  assert.equal(result.valid, false)
  assert.ok(result.diagnostics.some(d => d.code === 'invalid_stage'))
})

test('automaton validate command reports malformed current.json as structured diagnostics', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-cli-'))
  const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))
  const stateDir = join(root, '.agent', '.automaton', 'state')

  mkdirSync(stateDir, { recursive: true })
  writeFileSync(join(stateDir, 'current.json'), '{\n  "active_change": "x",\n', 'utf8')

  const proc = spawnSync(process.execPath, [cliPath, 'validate', root], { encoding: 'utf8' })
  const result = JSON.parse(proc.stdout)

  assert.equal(proc.status, 1)
  assert.equal(proc.stderr, '')
  assert.equal(result.valid, false)
  assert.equal(result.diagnostics[0].level, 'error')
  assert.equal(result.diagnostics[0].code, 'invalid_state_json')
})

test('automaton validate command exits 0 for valid state', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-cli-'))
  const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))

  saveCurrentState(join(root, '.agent', '.automaton', 'state', 'current.json'), {
    activeChange: 'my-change',
    stage: 'frame'
  })

  const proc = spawnSync(process.execPath, [cliPath, 'validate', root], { encoding: 'utf8' })

  assert.equal(proc.status, 0)
})

test('automaton validate command exits 0 for warning-only diagnostics', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-cli-'))
  const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))

  saveCurrentState(join(root, '.agent', '.automaton', 'state', 'current.json'), {
    activeChange: 'my-change',
    stage: 'frame',
    canonicalDesign: '.agent/work/my-change/DESIGN.md'
  })

  const proc = spawnSync(process.execPath, [cliPath, 'validate', root], { encoding: 'utf8' })
  const result = JSON.parse(proc.stdout)

  assert.equal(proc.status, 0)
  assert.equal(result.valid, true)
  assert.ok(result.diagnostics.some(d => d.code === 'stale_canonical_design' && d.level === 'warning'))
})

test('get-context and validateHandoff produce same codes for invalid stage', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-parity-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(target, JSON.stringify({ active_change: 'my-change', stage: 'bogus' }), 'utf8')

  const contextOutput = JSON.parse(
    execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  )
  const validateResult = validateHandoff({ activeChange: 'my-change', stage: 'bogus' }, root)

  const contextCodes = contextOutput.diagnostics.map(d => d.code).sort()
  const validateCodes = validateResult.diagnostics.map(d => d.code).sort()

  assert.deepEqual(contextCodes, validateCodes)
})

test('get-context and validateHandoff produce same codes for missing prerequisite', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-parity-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  saveCurrentState(target, { activeChange: 'my-change', stage: 'plan' })

  const contextOutput = JSON.parse(
    execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  )
  const validateResult = validateHandoff({ activeChange: 'my-change', stage: 'plan' }, root)

  const contextCodes = contextOutput.diagnostics.map(d => d.code).sort()
  const validateCodes = validateResult.diagnostics.map(d => d.code).sort()

  assert.deepEqual(contextCodes, validateCodes)
})

test('get-context and validateHandoff produce same codes for invalid verdict', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-parity-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  saveCurrentState(target, { activeChange: 'my-change', stage: 'frame', productReview: 'nope' })

  const contextOutput = JSON.parse(
    execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  )
  const validateResult = validateHandoff(
    { activeChange: 'my-change', stage: 'frame', productReview: 'nope' },
    root
  )

  const contextCodes = contextOutput.diagnostics.map(d => d.code).sort()
  const validateCodes = validateResult.diagnostics.map(d => d.code).sort()

  assert.deepEqual(contextCodes, validateCodes)
})

test('get-context and validateHandoff produce same codes for stale pointer', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-parity-'))
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  saveCurrentState(target, {
    activeChange: 'my-change',
    stage: 'plan',
    canonicalSpec: '.agent/work/my-change/SPEC.md'
  })

  const contextOutput = JSON.parse(
    execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  )
  const validateResult = validateHandoff(
    { activeChange: 'my-change', stage: 'plan', canonicalSpec: '.agent/work/my-change/SPEC.md' },
    root
  )

  const contextCodes = contextOutput.diagnostics.map(d => d.code).sort()
  const validateCodes = validateResult.diagnostics.map(d => d.code).sort()

  assert.deepEqual(contextCodes, validateCodes)
})

test('get-context skips file diagnostics when path is non-canonical', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-noncanonical-'))
  const target = join(root, 'some', 'random', 'current.json')
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))

  mkdirSync(join(root, 'some', 'random'), { recursive: true })
  writeFileSync(target, JSON.stringify({
    active_change: 'my-change',
    stage: 'plan',
    canonical_spec: '.agent/work/my-change/SPEC.md',
    product_review: 'nope'
  }), 'utf8')

  const contextOutput = JSON.parse(
    execFileSync(process.execPath, [script, target], { encoding: 'utf8' })
  )

  assert.ok(contextOutput.diagnostics.some(d => d.code === 'invalid_product_review'))
  assert.ok(!contextOutput.diagnostics.some(d => d.code === 'stale_canonical_spec'))
})

test('get-context reports warning and skips semantic checks when contract manifest is unavailable', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-validate-no-manifest-'))
  const script = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))
  const isolatedScript = join(root, '.agent', '.automaton', 'scripts', 'get-context.mjs')
  const target = join(root, '.agent', '.automaton', 'state', 'current.json')

  mkdirSync(join(root, '.agent', '.automaton', 'scripts'), { recursive: true })
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  copyFileSync(script, isolatedScript)
  writeFileSync(target, JSON.stringify({ active_change: 'my-change', stage: 'plan' }), 'utf8')

  const contextOutput = JSON.parse(
    execFileSync(process.execPath, [isolatedScript, target], { encoding: 'utf8', cwd: root })
  )

  assert.deepEqual(contextOutput.diagnostics, [
    {
      level: 'warning',
      code: 'contracts_manifest_missing',
      message: 'contract manifest not found; semantic diagnostics skipped'
    }
  ])
})
