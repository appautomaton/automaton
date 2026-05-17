import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  ARTIFACT_LAYOUT,
  CANONICAL_POINTER_CHECKS,
  CONTRACTS_DATA,
  ENGINEERING_REVIEW_VERDICTS,
  LENSES,
  PREREQUISITE_DIAGNOSTIC_CODES,
  PRODUCT_REVIEW_VERDICTS,
  STAGE_PREREQUISITES,
  STAGES,
  isValidEngineeringReview,
  isValidLens,
  isValidProductReview,
  isValidStage
} from '../lib/contracts.mjs'

const contractsManifest = JSON.parse(
  readFileSync(new URL('../runtime/lib/contracts-data.json', import.meta.url), 'utf8')
)

test('kernel contracts are driven by the checked-in contract manifest', () => {
  assert.deepEqual(CONTRACTS_DATA, contractsManifest)
  assert.deepEqual(STAGES, contractsManifest.stages)
  assert.deepEqual(LENSES, contractsManifest.lenses)
  assert.deepEqual(ARTIFACT_LAYOUT, contractsManifest.artifactLayout)
  assert.deepEqual(STAGE_PREREQUISITES, contractsManifest.stagePrerequisites)
  assert.deepEqual(PRODUCT_REVIEW_VERDICTS, contractsManifest.reviewVerdicts.product)
  assert.deepEqual(ENGINEERING_REVIEW_VERDICTS, contractsManifest.reviewVerdicts.engineering)
  assert.deepEqual(PREREQUISITE_DIAGNOSTIC_CODES, contractsManifest.prerequisiteDiagnosticCodes)
  assert.deepEqual(CANONICAL_POINTER_CHECKS, contractsManifest.canonicalPointerChecks)
})

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

test('kernel contracts expose stable stage prerequisites', () => {
  assert.deepEqual(STAGE_PREREQUISITES, {
    frame: [],
    plan: ['canonicalSpec'],
    execute: ['canonicalPlan'],
    verify: ['canonicalPlan'],
    resume: []
  })
})

test('kernel contracts expose stable review verdict vocabularies', () => {
  assert.deepEqual(PRODUCT_REVIEW_VERDICTS, ['approved', 'approved_with_risks', 'needs_clarification', 'descoped'])
  assert.deepEqual(ENGINEERING_REVIEW_VERDICTS, ['approved', 'approved_with_risks', 'needs_correction'])
  assert.equal(isValidProductReview('approved'), true)
  assert.equal(isValidProductReview('needs_clarification'), true)
  assert.equal(isValidProductReview('descoped'), true)
  assert.equal(isValidProductReview('rejected'), false)
  assert.equal(isValidEngineeringReview('approved'), true)
  assert.equal(isValidEngineeringReview('needs_correction'), true)
  assert.equal(isValidEngineeringReview('descoped'), false)
})
