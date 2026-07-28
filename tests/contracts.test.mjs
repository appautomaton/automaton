// Runtime behavior: contracts-data.json is the single source for every exported vocabulary (DD-004).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  ARTIFACT_LABELS,
  ARTIFACT_LAYOUT,
  ARTIFACT_LINT,
  CANONICAL_POINTER_CHECKS,
  CHECKPOINT_TYPES,
  CONTENT_FIELDS,
  CONTRACTS_DATA,
  ENGINEERING_REVIEW_VERDICTS,
  EXECUTION_ROUTES,
  LENSES,
  PREREQUISITE_DIAGNOSTIC_CODES,
  STAGE_PREREQUISITES,
  STAGES,
  SUBAGENT_STATUSES,
  VERDICT_ROUTING,
  isValidCheckpointType,
  isValidEngineeringReview,
  isValidExecutionRoute,
  isValidLens,
  isValidStage
} from '../lib/contracts.mjs'

const contractsManifest = JSON.parse(
  readFileSync(new URL('../runtime/lib/contracts-data.json', import.meta.url), 'utf8')
)

test('kernel contracts are driven by the checked-in contract manifest', () => {
  assert.deepEqual(CONTRACTS_DATA, contractsManifest)
  assert.deepEqual(STAGES, contractsManifest.stages)
  assert.deepEqual(LENSES, contractsManifest.lenses)
  assert.deepEqual(EXECUTION_ROUTES, contractsManifest.executionRoutes)
  assert.deepEqual(CHECKPOINT_TYPES, contractsManifest.checkpointTypes)
  assert.deepEqual(ARTIFACT_LAYOUT, contractsManifest.artifactLayout)
  assert.deepEqual(STAGE_PREREQUISITES, contractsManifest.stagePrerequisites)
  assert.deepEqual(ENGINEERING_REVIEW_VERDICTS, contractsManifest.reviewVerdicts.engineering)
  assert.deepEqual(PREREQUISITE_DIAGNOSTIC_CODES, contractsManifest.prerequisiteDiagnosticCodes)
  assert.deepEqual(CANONICAL_POINTER_CHECKS, contractsManifest.canonicalPointerChecks)
  assert.deepEqual(VERDICT_ROUTING, contractsManifest.verdictRouting)
  assert.deepEqual(ARTIFACT_LINT, contractsManifest.artifactLint)
  assert.deepEqual(SUBAGENT_STATUSES, contractsManifest.subagentStatuses)
  assert.deepEqual(CONTENT_FIELDS, contractsManifest.contentFields)
  assert.deepEqual(ARTIFACT_LABELS, contractsManifest.artifactLabels)
})

test('verdict routing covers every review verdict with known skills', () => {
  assert.deepEqual(Object.keys(VERDICT_ROUTING.engineering).sort(), ENGINEERING_REVIEW_VERDICTS.slice().sort())
  assert.equal(VERDICT_ROUTING.product, undefined)

  const knownSkills = new Set([
    'auto-frame', 'auto-plan',
    'auto-eng-review', 'auto-execute', 'auto-verify', 'auto-resume'
  ])
  for (const routing of [VERDICT_ROUTING.engineering]) {
    for (const [verdict, skills] of Object.entries(routing)) {
      assert.ok(skills.length > 0, `${verdict} must route somewhere`)
      for (const skill of skills) {
        assert.ok(knownSkills.has(skill), `${verdict} routes to unknown skill ${skill}`)
      }
    }
  }
})

test('artifact lint vocabulary is well-formed', () => {
  for (const check of ARTIFACT_LINT.spec) {
    assert.ok(check.code && check.pattern && check.message)
    assert.doesNotThrow(() => new RegExp(check.pattern, 'i'))
  }
  assert.doesNotThrow(() => new RegExp(ARTIFACT_LINT.planSliceHeading, 'm'))
  for (const field of ARTIFACT_LINT.planSliceFields) {
    assert.ok(field.code && field.label)
  }
  assert.ok(ARTIFACT_LINT.planMissingSlices.code)
})

test('kernel contracts expose stable stage, lens, and artifact layout values', () => {
  assert.deepEqual(STAGES, ['frame', 'plan', 'execute', 'verify', 'verified', 'resume'])
  assert.deepEqual(LENSES, ['product', 'engineering', 'design', 'security', 'runtime', 'content'])
  assert.deepEqual(ARTIFACT_LAYOUT, {
    agentRoot: '.agent',
    runtimeRoot: '.agent/.automaton',
    steeringDir: 'steering',
    workDir: 'work'
  })
  assert.equal(ARTIFACT_LAYOUT.runtimeRoot, `${ARTIFACT_LAYOUT.agentRoot}/.automaton`)
  assert.equal(isValidStage('plan'), true)
  assert.equal(isValidStage('invent'), false)
  assert.equal(isValidLens('engineering'), true)
  assert.equal(isValidLens('marketing'), false)
})

test('kernel contracts expose stable execution-route and checkpoint vocabularies', () => {
  assert.deepEqual(EXECUTION_ROUTES, ['direct', 'subagent recommended', 'subagent required'])
  assert.deepEqual(CHECKPOINT_TYPES, ['none', 'human-verify', 'decision', 'human-action'])
  assert.equal(isValidExecutionRoute('subagent required'), true)
  assert.equal(isValidExecutionRoute('parallel'), false)
  assert.equal(isValidCheckpointType('human-verify'), true)
  assert.equal(isValidCheckpointType('blocking'), false)
})

test('kernel contracts expose stable stage prerequisites', () => {
  // The spec chain holds end to end: every stage from execute onward carries
  // both pointers, so cold resume can always load artifacts in dependency
  // order (spec first, then plan).
  assert.deepEqual(STAGE_PREREQUISITES, {
    frame: [],
    plan: ['canonicalSpec'],
    execute: ['canonicalSpec', 'canonicalPlan'],
    verify: ['canonicalSpec', 'canonicalPlan'],
    verified: ['canonicalSpec', 'canonicalPlan'],
    resume: []
  })
})

test('kernel contracts expose stable review verdict vocabularies', () => {
  assert.deepEqual(ENGINEERING_REVIEW_VERDICTS, ['approved', 'approved_with_risks', 'needs_correction'])
  assert.equal(CONTRACTS_DATA.reviewVerdicts.product, undefined, 'product review vocabulary must not return')
  assert.equal(isValidEngineeringReview('approved'), true)
  assert.equal(isValidEngineeringReview('needs_correction'), true)
  assert.equal(isValidEngineeringReview('descoped'), false)
})
