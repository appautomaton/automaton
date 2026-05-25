import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CHECKPOINT_TYPES, EXECUTION_ROUTES, TOPOLOGY_LABELS } from '../lib/contracts.mjs'

// The plan→execute handoff is coupled on a shared vocabulary: auto-plan EMITS execution routes,
// checkpoint types, and topology labels into PLAN.md, and auto-execute CONSUMES them. Nothing at runtime enforces the
// vocabulary, so a silent rename on either side would make execute fall back to serial/direct with
// no error and no failing test — a capability would vanish quietly. These tests pin both ends to the
// single source of truth in contracts-data.json so drift fails loudly in CI instead.

const skillsRoot = fileURLToPath(new URL('../skills', import.meta.url))
const planSkill = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')
const executeSkill = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')

test('execution-route and checkpoint contracts are non-empty closed vocabularies', () => {
  assert.ok(EXECUTION_ROUTES.length > 0, 'EXECUTION_ROUTES must be defined in contracts-data.json')
  assert.ok(CHECKPOINT_TYPES.length > 0, 'CHECKPOINT_TYPES must be defined in contracts-data.json')
})

test('auto-plan emits exactly the execution-route vocabulary defined in contracts', () => {
  assert.ok(
    planSkill.includes(`**Execution:** ${EXECUTION_ROUTES.join(' | ')}`),
    'auto-plan slice template must list executionRoutes verbatim from contracts-data.json'
  )
})

test('auto-plan emits exactly the checkpoint vocabulary defined in contracts', () => {
  assert.ok(
    planSkill.includes(`**Checkpoint after:** ${CHECKPOINT_TYPES.join(' | ')}`),
    'auto-plan slice template must list checkpointTypes verbatim from contracts-data.json'
  )
})

test('auto-execute recognizes every execution route auto-plan can emit', () => {
  for (const route of EXECUTION_ROUTES) {
    assert.ok(
      executeSkill.includes(route),
      `auto-execute must recognize execution route "${route}" (plan→execute contract drift)`
    )
  }
})

test('auto-execute recognizes every checkpoint type auto-plan can emit', () => {
  for (const checkpoint of CHECKPOINT_TYPES) {
    assert.ok(
      executeSkill.includes(checkpoint),
      `auto-execute must recognize checkpoint type "${checkpoint}" (plan→execute contract drift)`
    )
  }
})

const PARALLEL_SAFE_LABEL = TOPOLOGY_LABELS.parallelSafeGroups

test('topology-label contract is a non-empty closed vocabulary', () => {
  assert.ok(
    typeof PARALLEL_SAFE_LABEL === 'string' && PARALLEL_SAFE_LABEL.length > 0,
    'TOPOLOGY_LABELS.parallelSafeGroups must be defined in contracts-data.json'
  )
})

test('auto-plan emits the parallel-safe topology label defined in contracts', () => {
  assert.ok(
    planSkill.includes(`**${PARALLEL_SAFE_LABEL}**`),
    'auto-plan slice template must emit the **Parallel-safe groups:** field verbatim from contracts-data.json'
  )
})

test('auto-execute recognizes the parallel-safe topology label defined in contracts', () => {
  assert.ok(
    executeSkill.includes(PARALLEL_SAFE_LABEL),
    'auto-execute must recognize the parallel-safe topology label (plan→execute contract drift)'
  )
})

// The label tests above pin the checkpoint *vocabulary*. They do not pin its *meaning*: auto-plan and
// auto-execute used to each carry their own prose definition of human-verify/decision/human-action, and
// those had already drifted (plan defined `decision` over "scope" options; execute over "risk posture").
// Both files still contained the label strings, so the tests above stayed green through the drift. These
// tests move the definitions to a single home in ARTIFACT-LIFECYCLE.md and fail if a skill re-hosts one.
const lifecycleRef = readFileSync(
  join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'),
  'utf8'
)

test('ARTIFACT-LIFECYCLE.md is the single home for checkpoint semantics', () => {
  assert.ok(
    lifecycleRef.includes('## Checkpoint Semantics'),
    'ARTIFACT-LIFECYCLE.md must define checkpoint semantics in one section'
  )
  for (const checkpoint of CHECKPOINT_TYPES) {
    assert.ok(
      lifecycleRef.includes(`\`${checkpoint}\``),
      `Checkpoint Semantics must define "${checkpoint}"`
    )
  }
})

test('auto-plan and auto-execute point to checkpoint semantics instead of re-defining them', () => {
  const pointer = 'ARTIFACT-LIFECYCLE.md` (Checkpoint Semantics)'
  assert.ok(planSkill.includes(pointer), 'auto-plan must point to the canonical checkpoint semantics')
  assert.ok(executeSkill.includes(pointer), 'auto-execute must point to the canonical checkpoint semantics')

  // Distinctive fragments of the canonical per-type definitions must live only in the contract.
  const definitionFragments = [
    'local inspection cannot verify the result', // human-verify
    'among named product, architecture, design', // decision: option categories
    'concrete question and the options', // decision: reason content
    'reversible engineering judgment', // decision: exclusions
  ]
  for (const fragment of definitionFragments) {
    assert.ok(lifecycleRef.includes(fragment), `ARTIFACT-LIFECYCLE.md must hold the definition fragment: ${fragment}`)
    assert.ok(!planSkill.includes(fragment), `auto-plan must not re-define checkpoints: ${fragment}`)
    assert.ok(!executeSkill.includes(fragment), `auto-execute must not re-define checkpoints: ${fragment}`)
  }
})
