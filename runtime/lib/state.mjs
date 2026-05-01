import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { isValidStage } from './contracts.mjs'

function normalizeCurrentState(state) {
  const {
    active_change: activeChangeSnake,
    canonical_spec: canonicalSpecSnake,
    canonical_design: canonicalDesignSnake,
    canonical_plan: canonicalPlanSnake,
    product_review: productReviewSnake,
    engineering_review: engineeringReviewSnake,
    activeChange,
    canonicalSpec,
    canonicalDesign,
    canonicalPlan,
    productReview,
    engineeringReview,
    ...rest
  } = state

  const normalized = { ...rest }

  if (activeChange !== undefined || activeChangeSnake !== undefined) {
    normalized.activeChange = activeChange ?? activeChangeSnake
  }

  if (canonicalSpec !== undefined || canonicalSpecSnake !== undefined) {
    normalized.canonicalSpec = canonicalSpec ?? canonicalSpecSnake
  }

  if (canonicalDesign !== undefined || canonicalDesignSnake !== undefined) {
    normalized.canonicalDesign = canonicalDesign ?? canonicalDesignSnake
  }

  if (canonicalPlan !== undefined || canonicalPlanSnake !== undefined) {
    normalized.canonicalPlan = canonicalPlan ?? canonicalPlanSnake
  }

  if (productReview !== undefined || productReviewSnake !== undefined) {
    normalized.productReview = productReview ?? productReviewSnake
  }

  if (engineeringReview !== undefined || engineeringReviewSnake !== undefined) {
    normalized.engineeringReview = engineeringReview ?? engineeringReviewSnake
  }

  return normalized
}

function validateCurrentState(state) {
  if (state.activeChange === undefined) {
    throw new Error('invalid current state: missing active change')
  }

  if (state.stage === undefined) {
    throw new Error('invalid current state: missing stage')
  }

  if (!isValidStage(state.stage)) {
    throw new Error(`invalid stage: ${state.stage}`)
  }

  return state
}

function serializeCurrentState(state) {
  const normalized = validateCurrentState(normalizeCurrentState(state))

  return {
    ...(normalized.activeChange !== undefined ? { active_change: normalized.activeChange } : {}),
    ...(normalized.stage !== undefined ? { stage: normalized.stage } : {}),
    ...(normalized.canonicalSpec !== undefined ? { canonical_spec: normalized.canonicalSpec } : {}),
    ...(normalized.canonicalDesign !== undefined ? { canonical_design: normalized.canonicalDesign } : {}),
    ...(normalized.canonicalPlan !== undefined ? { canonical_plan: normalized.canonicalPlan } : {}),
    ...(normalized.productReview !== undefined ? { product_review: normalized.productReview } : {}),
    ...(normalized.engineeringReview !== undefined ? { engineering_review: normalized.engineeringReview } : {}),
    ...Object.fromEntries(
      Object.entries(normalized).filter(
        ([key]) =>
          ![
            'activeChange',
            'stage',
            'canonicalSpec',
            'canonicalDesign',
            'canonicalPlan',
            'productReview',
            'engineeringReview',
            'active_change',
            'canonical_spec',
            'canonical_design',
            'canonical_plan',
            'product_review',
            'engineering_review'
          ].includes(key)
      )
    )
  }
}

export function saveCurrentState(target, state) {
  const normalized = validateCurrentState(normalizeCurrentState(state))

  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, JSON.stringify(serializeCurrentState(normalized), null, 2) + '\n', 'utf8')
}

export function loadCurrentState(target) {
  return validateCurrentState(normalizeCurrentState(JSON.parse(readFileSync(target, 'utf8'))))
}
