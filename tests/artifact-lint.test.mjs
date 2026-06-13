import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ARTIFACT_LINT } from '../lib/contracts.mjs'

// L2 artifact-shape lint: get-context.mjs and sync-status.mjs surface warning-level
// diagnostics when the canonical SPEC or PLAN is missing required shape. Warnings
// inform the reading skill; they never block. Only L1 stays error-level.

const getContextPath = fileURLToPath(new URL('../skills/_shared/scripts/get-context.mjs', import.meta.url))
const syncStatusPath = fileURLToPath(new URL('../skills/_shared/scripts/sync-status.mjs', import.meta.url))
const manifestSource = fileURLToPath(new URL('../runtime/lib/contracts-data.json', import.meta.url))
const planSkill = readFileSync(fileURLToPath(new URL('../skills/auto-plan/SKILL.md', import.meta.url)), 'utf8')

const COMPLETE_SPEC = [
  '# SPEC',
  '',
  'Bounded goal: one sentence.',
  '',
  '## Acceptance Criteria',
  '- the command exits 0',
  '',
  '## Anti-Goals',
  '- no archive behavior',
  ''
].join('\n')

const COMPLETE_PLAN = [
  '# PLAN',
  '',
  '### Slice 1: Wire the flag',
  '',
  '**Objective:** add the flag',
  '**Acceptance criteria:**',
  '- flag parses',
  '**Verification:** node --test tests/flag.test.mjs',
  ''
].join('\n')

function scaffold({ spec, plan }) {
  const root = mkdtempSync(join(tmpdir(), 'automaton-lint-'))
  const change = '2026-06-12-lint-fixture'
  const workDir = join(root, '.agent', 'work', change)
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  mkdirSync(join(root, '.agent', '.automaton', 'lib'), { recursive: true })
  mkdirSync(workDir, { recursive: true })
  cpSync(manifestSource, join(root, '.agent', '.automaton', 'lib', 'contracts-data.json'))

  const state = { active_change: change, stage: 'plan' }
  if (spec !== undefined) {
    writeFileSync(join(workDir, 'SPEC.md'), spec, 'utf8')
    state.canonical_spec = `.agent/work/${change}/SPEC.md`
  }
  if (plan !== undefined) {
    writeFileSync(join(workDir, 'PLAN.md'), plan, 'utf8')
    state.canonical_plan = `.agent/work/${change}/PLAN.md`
  }

  const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')
  writeFileSync(currentPath, JSON.stringify(state, null, 2) + '\n', 'utf8')
  return { root, currentPath }
}

function runGetContext(currentPath) {
  const result = spawnSync(process.execPath, [getContextPath, currentPath], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

function lintCodes(diagnostics) {
  const known = new Set([
    ...ARTIFACT_LINT.spec.map((check) => check.code),
    ...ARTIFACT_LINT.planSliceFields.map((field) => field.code),
    ARTIFACT_LINT.planMissingSlices.code
  ])
  return diagnostics.filter((item) => known.has(item.code))
}

test('well-shaped spec and plan produce no lint warnings', () => {
  const { currentPath } = scaffold({ spec: COMPLETE_SPEC, plan: COMPLETE_PLAN })
  const output = runGetContext(currentPath)

  assert.deepEqual(lintCodes(output.diagnostics), [])
})

test('get-context surfaces warning-level lint for missing shape', () => {
  const gappySpec = '# SPEC\n\nBounded goal: one sentence.\n'
  const gappyPlan = [
    '# PLAN',
    '',
    '### Slice 1: Wire the flag',
    '',
    '**Objective:** add the flag',
    '',
    '### Slice 2: Document the flag',
    '',
    '**Acceptance criteria:**',
    '- README names the flag',
    '**Verification:** grep -q flag README.md',
    ''
  ].join('\n')

  const { currentPath } = scaffold({ spec: gappySpec, plan: gappyPlan })
  const output = runGetContext(currentPath)
  const codes = output.diagnostics.map((item) => item.code)

  assert.ok(codes.includes('spec_missing_acceptance_criteria'))
  assert.ok(codes.includes('spec_missing_anti_goals'))
  assert.ok(codes.includes('slice_missing_acceptance_criteria'))
  assert.ok(codes.includes('slice_missing_verification'))
  assert.ok(codes.includes('slice_missing_objective'))

  const sliceWarnings = output.diagnostics.filter((item) => item.code.startsWith('slice_'))
  assert.ok(sliceWarnings.some((item) => item.message.includes('slice 1')))
  assert.ok(sliceWarnings.some((item) => item.message.includes('slice 2')))

  for (const item of lintCodes(output.diagnostics)) {
    assert.equal(item.level, 'warning', `${item.code} must stay warning-level`)
  }
})

test('a plan with no slice headings warns plan_missing_slices', () => {
  const { currentPath } = scaffold({ spec: COMPLETE_SPEC, plan: '# PLAN\n\nProse only, no slices.\n' })
  const output = runGetContext(currentPath)

  assert.ok(output.diagnostics.some((item) => item.code === 'plan_missing_slices' && item.level === 'warning'))
})

test('lint warnings do not block a sync-status write', () => {
  const { root, currentPath } = scaffold({ spec: COMPLETE_SPEC, plan: '# PLAN\n\nProse only, no slices.\n' })

  const result = spawnSync(
    process.execPath,
    [syncStatusPath, root, '--stage', 'execute'],
    { encoding: 'utf8' }
  )

  assert.equal(result.status, 0, result.stderr)
  const output = JSON.parse(result.stdout)
  assert.equal(output.synced, true)
  assert.ok(output.diagnostics.some((item) => item.code === 'plan_missing_slices'))
  assert.match(readFileSync(currentPath, 'utf8'), /"stage": "execute"/)
})

test('auto-plan emits every slice field label the lint checks for', () => {
  // Plan template and lint vocabulary are two ends of one contract: if the template
  // renames a required field, the lint would flag every new plan as malformed.
  for (const field of ARTIFACT_LINT.planSliceFields) {
    assert.ok(
      planSkill.includes(field.label),
      `auto-plan slice template must emit ${field.label} verbatim from contracts-data.json`
    )
  }
  assert.match(planSkill, new RegExp(ARTIFACT_LINT.planSliceHeading.replace('(\\S+)', 'N'), 'm'))
})

// Review verdict integrity: a verdict field in state must have its rationale
// section on the canonical artifact. Drift between the two means the verdict
// was synced but the review never landed (or was overwritten).
test('a review verdict without its artifact section surfaces a warning', () => {
  const { currentPath } = scaffold({ spec: COMPLETE_SPEC, plan: COMPLETE_PLAN })
  const state = JSON.parse(readFileSync(currentPath, 'utf8'))
  state.product_review = 'approved'
  state.engineering_review = 'approved'
  writeFileSync(currentPath, JSON.stringify(state, null, 2) + '\n', 'utf8')

  const codes = runGetContext(currentPath).diagnostics.map((item) => item.code)
  assert.ok(codes.includes('product_review_section_missing'))
  assert.ok(codes.includes('engineering_review_section_missing'))
})

test('a review verdict with its artifact section in place is silent', () => {
  const { root, currentPath } = scaffold({
    spec: `${COMPLETE_SPEC}\n## Review: Product\n\nVerdict: approved\n`,
    plan: `${COMPLETE_PLAN}\n## Review: Engineering\n\nVerdict: approved\n`
  })
  const state = JSON.parse(readFileSync(currentPath, 'utf8'))
  state.product_review = 'approved'
  state.engineering_review = 'approved'
  writeFileSync(currentPath, JSON.stringify(state, null, 2) + '\n', 'utf8')

  const codes = runGetContext(currentPath).diagnostics.map((item) => item.code)
  assert.equal(codes.includes('product_review_section_missing'), false)
  assert.equal(codes.includes('engineering_review_section_missing'), false)
})

// State drift: the cursor can silently lag a repo that moves outside the
// harness. The hint is a warning for the reading skill; non-git projects and
// quiet repos stay silent.
test('commits after the state file was written surface a drift hint', () => {
  const { root, currentPath } = scaffold({ spec: COMPLETE_SPEC, plan: COMPLETE_PLAN })
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
  }
  git('init', '-q', '.')
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'one')
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'two')
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'three')

  const drift = runGetContext(currentPath).diagnostics.find((item) => item.code === 'state_drift')
  assert.ok(drift, 'three commits after the state write must surface state_drift')
  assert.equal(drift.level, 'warning')
})

test('a non-git project and a quiet repo produce no drift hint', () => {
  const quiet = scaffold({ spec: COMPLETE_SPEC, plan: COMPLETE_PLAN })
  const codes = runGetContext(quiet.currentPath).diagnostics.map((item) => item.code)
  assert.equal(codes.includes('state_drift'), false)
  assert.equal(codes.includes('dirty_tree_at_verified'), false)
})
