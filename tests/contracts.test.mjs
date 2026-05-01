import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ARTIFACT_LAYOUT,
  LENSES,
  STAGES,
  isValidLens,
  isValidStage
} from '../lib/contracts.mjs'

test('kernel contracts expose stable stage, lens, and artifact layout values', () => {
  assert.deepEqual(STAGES, ['frame', 'plan', 'execute', 'verify', 'resume'])
  assert.deepEqual(LENSES, ['product', 'engineering', 'design', 'security', 'runtime'])
  assert.deepEqual(ARTIFACT_LAYOUT, {
    agentRoot: '.agent',
    runtimeRoot: '.agent/.automaton',
    steeringDir: 'steering',
    wikiDir: 'wiki',
    workDir: 'work'
  })
  assert.equal(ARTIFACT_LAYOUT.runtimeRoot, `${ARTIFACT_LAYOUT.agentRoot}/.automaton`)
  assert.equal(isValidStage('plan'), true)
  assert.equal(isValidStage('invent'), false)
  assert.equal(isValidLens('engineering'), true)
  assert.equal(isValidLens('marketing'), false)
})
