import test from 'node:test'
import assert from 'node:assert/strict'

import { STAGES } from '../lib/contracts.mjs'
import { contextSummary, retrievalProfile } from '../lib/retrieval.mjs'

test('retrieval profile covers every contract stage', () => {
  assert.deepEqual(STAGES, ['frame', 'plan', 'execute', 'verify', 'verified', 'resume'])
  assert.deepEqual(retrievalProfile('frame'), ['request', 'steering', 'wiki'])
  assert.deepEqual(retrievalProfile('plan'), ['request', 'steering', 'work', 'wiki'])
  assert.deepEqual(retrievalProfile('execute'), ['request', 'work', 'packet'])
  assert.deepEqual(retrievalProfile('verify'), ['request', 'work', 'evidence'])
  assert.deepEqual(retrievalProfile('verified'), ['request', 'work', 'evidence'])
  assert.deepEqual(retrievalProfile('resume'), ['request', 'steering', 'work', 'state'])
})

test('context summary joins retrieval layers in order', () => {
  assert.equal(contextSummary('verify'), 'request -> work -> evidence')
})

test('retrieval profile rejects unknown stages', () => {
  assert.throws(() => retrievalProfile('unknown'), /unknown stage: unknown/)
})

test('retrieval profile returns a defensive copy', () => {
  const profile = retrievalProfile('plan')
  profile.push('mutated')

  assert.deepEqual(retrievalProfile('plan'), ['request', 'steering', 'work', 'wiki'])
})
