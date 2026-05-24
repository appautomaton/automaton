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
