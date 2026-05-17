import { existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  isValidStage,
  isValidProductReview,
  isValidEngineeringReview,
  STAGE_PREREQUISITES,
  PREREQUISITE_DIAGNOSTIC_CODES,
  CANONICAL_POINTER_CHECKS
} from './contracts.mjs'
import { readStatusPointer, statusPointerConflict } from './status.mjs'

function diagnostic(level, code, message) {
  return { level, code, message }
}

export function validateState(state) {
  const diagnostics = []

  if (state.activeChange === undefined || state.activeChange === 'none') {
    diagnostics.push(diagnostic('error', 'missing_active_change', 'no active change recorded'))
  }

  if (state.stage === undefined || state.stage === 'none') {
    diagnostics.push(diagnostic('error', 'missing_stage', 'no stage recorded'))
    return { valid: diagnostics.length === 0, diagnostics }
  }

  if (!isValidStage(state.stage)) {
    diagnostics.push(diagnostic('error', 'invalid_stage', `invalid stage: ${state.stage}`))
    return { valid: false, diagnostics }
  }

  const required = STAGE_PREREQUISITES[state.stage] ?? []
  for (const field of required) {
    if (state[field] === undefined || state[field] === null) {
      const code = PREREQUISITE_DIAGNOSTIC_CODES[field] ?? `missing_${field}`
      diagnostics.push(diagnostic('error', code, `${state.stage} stage requires ${field}`))
    }
  }

  if (state.productReview !== undefined && state.productReview !== null) {
    if (!isValidProductReview(state.productReview)) {
      diagnostics.push(diagnostic('error', 'invalid_product_review', `unrecognized product_review verdict: ${state.productReview}`))
    }
  }

  if (state.engineeringReview !== undefined && state.engineeringReview !== null) {
    if (!isValidEngineeringReview(state.engineeringReview)) {
      diagnostics.push(diagnostic('error', 'invalid_engineering_review', `unrecognized engineering_review verdict: ${state.engineeringReview}`))
    }
  }

  return { valid: diagnostics.length === 0, diagnostics }
}

export function validateArtifacts(state, projectRoot) {
  const diagnostics = []

  for (const { field, code, level } of CANONICAL_POINTER_CHECKS) {
    if (state[field] && !existsSync(join(projectRoot, state[field]))) {
      diagnostics.push(diagnostic(level, code, `${field} points to ${state[field]} but file does not exist`))
    }
  }

  return diagnostics
}

export function validateStatusAgreement(state, projectRoot) {
  const statusPath = join(projectRoot, '.agent', 'steering', 'STATUS.md')
  const pointer = readStatusPointer(statusPath)
  const conflict = statusPointerConflict(state, pointer)

  if (conflict === null) {
    return []
  }

  return [
    diagnostic(
      'warning',
      'status_mismatch',
      `STATUS.md says change=${conflict.status.activeChange} stage=${conflict.status.stage}; current.json says change=${conflict.current.activeChange} stage=${conflict.current.stage}`
    )
  ]
}

export function validateHandoff(state, projectRoot) {
  const stateResult = validateState(state)

  const artifactDiagnostics = stateResult.diagnostics.every(d => d.code !== 'invalid_stage')
    ? validateArtifacts(state, projectRoot)
    : []

  const canCheckStatus = state.activeChange && state.activeChange !== 'none' &&
    state.stage && state.stage !== 'none' && isValidStage(state.stage)
  const statusDiagnostics = canCheckStatus
    ? validateStatusAgreement(state, projectRoot)
    : []

  const allDiagnostics = [...stateResult.diagnostics, ...artifactDiagnostics, ...statusDiagnostics]

  return {
    valid: allDiagnostics.every(d => d.level !== 'error'),
    diagnostics: allDiagnostics
  }
}
