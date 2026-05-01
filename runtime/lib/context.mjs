import { existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import { loadCurrentState } from './state.mjs'
import { loadStatusSummary } from './status.mjs'

const DEFAULT_ONBOARDING_STEP = 'Run `auto-onboard` to refresh project truth for the repository before continuing.'

function loadCurrentStateSummary(projectRoot) {
  const target = join(projectRoot, '.agent', '.automaton', 'state', 'current.json')

  if (!existsSync(target)) {
    return null
  }

  try {
    return loadCurrentState(target)
  } catch {
    return null
  }
}

function loadStatus(projectRoot) {
  const target = join(projectRoot, '.agent', 'steering', 'STATUS.md')

  if (!existsSync(target)) {
    return null
  }

  try {
    return loadStatusSummary(target)
  } catch {
    return null
  }
}

function canonicalArtifacts(state) {
  return [state?.canonicalSpec, state?.canonicalDesign, state?.canonicalPlan].filter(
    (target) => typeof target === 'string' && target.length > 0
  )
}

function normalizeText(value) {
  return value.trim().replace(/\s+/g, ' ')
}

function clip(value, maxLength = 140) {
  const normalized = normalizeText(value)

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 3)}...`
}

function summarizeEntries(entries, limit = 2, maxLength = 120) {
  return entries.slice(0, limit).map((entry) => clip(entry, maxLength))
}

function formatArtifactTargets(artifacts, activeChange) {
  if (artifacts.length === 0) {
    return activeChange ? `.agent/work/${activeChange}/` : null
  }

  const directories = [...new Set(artifacts.map((target) => dirname(target)))]

  if (directories.length === 1 && artifacts.length > 1) {
    return `${directories[0]}/{${artifacts.map((target) => basename(target)).join(', ')}}`
  }

  return artifacts.join(', ')
}

function statusMatchesState(status, state) {
  return status !== null && state !== null && status.activeChange === state.activeChange && status.stage === state.stage
}

function isScaffoldStatus(status) {
  if (status === null) {
    return false
  }

  const noProgress = (status.whatIsTrueNow ?? []).length === 0
  const noRisks = (status.openRisks ?? []).length === 0
  const nextStep = normalizeText(status.nextStep ?? '')

  return noProgress && noRisks && nextStep === DEFAULT_ONBOARDING_STEP
}

export function buildSessionContext(projectRoot, options = {}) {
  const { compacted = false } = options
  const state = loadCurrentStateSummary(projectRoot)
  const status = loadStatus(projectRoot)
  const activeChange = state?.activeChange
  const stage = state?.stage
  const artifacts = canonicalArtifacts(state)
  const artifactTargets = formatArtifactTargets(artifacts, activeChange)
  const messages = []

  if (activeChange && stage) {
    messages.push(`Automaton: change=${activeChange}; stage=${stage}.`)
  } else {
    messages.push('Automaton: no active state recorded.')
  }

  if (artifactTargets) {
    messages.push(`Read .agent/steering/STATUS.md and ${artifactTargets}.`)
  } else {
    messages.push('Read .agent/steering/STATUS.md first.')
  }

  if (statusMatchesState(status, state) && !isScaffoldStatus(status)) {
    const progress = summarizeEntries(status.whatIsTrueNow ?? [])

    if (progress.length > 0) {
      messages.push(`Progress: ${progress.join(' ')}`)
    }

    if (status.nextStep) {
      messages.push(`Next: ${clip(status.nextStep)}`)
    }
  } else if (statusMatchesState(status, state) && isScaffoldStatus(status)) {
    messages.push('STATUS.md summary is scaffold-level; use canonical artifacts for current progress.')
  } else if (status !== null && state !== null) {
    messages.push('STATUS.md summary is stale; prefer current.json and canonical artifacts.')
  }

  messages.push('Run auto-onboard only if steering is missing or still scaffold-level.')

  if (compacted) {
    messages.push('Context compacted; reload only those artifacts before broad scans.')
  }

  return messages.join(' ')
}
