import { isValidStage } from './contracts.mjs'

const profiles = {
  frame: ['request', 'steering', 'wiki'],
  plan: ['request', 'steering', 'work', 'wiki'],
  execute: ['request', 'work', 'packet'],
  verify: ['request', 'work', 'evidence'],
  verified: ['request', 'work', 'evidence'],
  resume: ['request', 'steering', 'work', 'state']
}

export function retrievalProfile(stage) {
  if (!isValidStage(stage)) {
    throw new Error(`unknown stage: ${stage}`)
  }

  const profile = profiles[stage]
  if (!profile) {
    throw new Error(`missing retrieval profile: ${stage}`)
  }

  return [...profile]
}

export function contextSummary(stage) {
  return retrievalProfile(stage).join(' -> ')
}
