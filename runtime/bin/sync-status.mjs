#!/usr/bin/env node
import { existsSync } from 'node:fs'

import { loadCurrentState, saveCurrentState } from '../lib/state.mjs'
import { saveStatusSummary } from '../lib/status.mjs'

const [currentTarget, statusTarget, payloadRaw] = process.argv.slice(2)

if (currentTarget === undefined || statusTarget === undefined || payloadRaw === undefined) {
  throw new Error('missing required args: current target status target payload')
}

const payload = JSON.parse(payloadRaw)
const currentState = existsSync(currentTarget) ? loadCurrentState(currentTarget) : {}

saveCurrentState(currentTarget, {
  ...currentState,
  ...(payload.activeChange !== undefined ? { activeChange: payload.activeChange } : {}),
  ...(payload.active_change !== undefined ? { active_change: payload.active_change } : {}),
  ...(payload.stage !== undefined ? { stage: payload.stage } : {}),
  ...(payload.canonicalSpec !== undefined ? { canonicalSpec: payload.canonicalSpec } : {}),
  ...(payload.canonical_spec !== undefined ? { canonical_spec: payload.canonical_spec } : {}),
  ...(payload.canonicalDesign !== undefined ? { canonicalDesign: payload.canonicalDesign } : {}),
  ...(payload.canonical_design !== undefined ? { canonical_design: payload.canonical_design } : {}),
  ...(payload.canonicalPlan !== undefined ? { canonicalPlan: payload.canonicalPlan } : {}),
  ...(payload.canonical_plan !== undefined ? { canonical_plan: payload.canonical_plan } : {}),
  ...(payload.productReview !== undefined ? { productReview: payload.productReview } : {}),
  ...(payload.product_review !== undefined ? { product_review: payload.product_review } : {}),
  ...(payload.engineeringReview !== undefined ? { engineeringReview: payload.engineeringReview } : {}),
  ...(payload.engineering_review !== undefined ? { engineering_review: payload.engineering_review } : {})
})

saveStatusSummary(statusTarget, {
  activeChange: payload.activeChange ?? payload.active_change,
  stage: payload.stage,
  whatIsTrueNow: payload.whatIsTrueNow ?? payload.what_is_true_now,
  nextStep: payload.nextStep ?? payload.next_step,
  openRisks: payload.openRisks ?? payload.open_risks
})
