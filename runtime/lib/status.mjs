import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { isValidStage } from './contracts.mjs'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractSection(source, heading) {
  const match = source.match(new RegExp(`## ${escapeRegExp(heading)}\\n\\n([\\s\\S]*?)(?=\\n## |$)`))

  return match?.[1].trim() ?? ''
}

function normalizeBulletList(entries) {
  return entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== 'none recorded')
}

function parseBulletList(section) {
  return normalizeBulletList(
    section
      .split('\n')
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2))
  )
}

function renderBulletList(entries) {
  const normalized = normalizeBulletList(entries)

  return (normalized.length > 0 ? normalized : ['none recorded']).map((entry) => `- ${entry}`).join('\n')
}

function validateStatusSummary(summary) {
  if (summary.activeChange === undefined) {
    throw new Error('invalid status summary: missing active change')
  }

  if (summary.stage === undefined) {
    throw new Error('invalid status summary: missing stage')
  }

  if (!isValidStage(summary.stage)) {
    throw new Error(`invalid stage: ${summary.stage}`)
  }

  if (summary.nextStep === undefined || summary.nextStep.trim().length === 0) {
    throw new Error('invalid status summary: missing next step')
  }

  return {
    activeChange: summary.activeChange,
    stage: summary.stage,
    whatIsTrueNow: normalizeBulletList(summary.whatIsTrueNow ?? []),
    nextStep: summary.nextStep.trim(),
    openRisks: normalizeBulletList(summary.openRisks ?? [])
  }
}

function parseStatusSummary(source) {
  return validateStatusSummary({
    activeChange: source.match(/^- active change: `([^`]+)`(?:\s.*)?$/m)?.[1],
    stage: source.match(/^- current stage: `([^`]+)`(?:\s.*)?$/m)?.[1],
    whatIsTrueNow: parseBulletList(extractSection(source, 'What Is True Now')),
    nextStep: extractSection(source, 'Next Step'),
    openRisks: parseBulletList(extractSection(source, 'Open Risks'))
  })
}

export function renderStatusSummary(summary) {
  const normalized = validateStatusSummary(summary)

  return [
    '# Status',
    '',
    '## Current Change',
    '',
    `- active change: \`${normalized.activeChange}\``,
    `- current stage: \`${normalized.stage}\``,
    '',
    '## What Is True Now',
    '',
    renderBulletList(normalized.whatIsTrueNow),
    '',
    '## Next Step',
    '',
    normalized.nextStep,
    '',
    '## Open Risks',
    '',
    renderBulletList(normalized.openRisks),
    ''
  ].join('\n')
}

export function saveStatusSummary(target, summary) {
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, renderStatusSummary(summary), 'utf8')
}

export function loadStatusSummary(target) {
  return parseStatusSummary(readFileSync(target, 'utf8'))
}

export function readStatusPointer(target) {
  try {
    const source = readFileSync(target, 'utf8')
    const activeChange = source.match(/^- active change: `([^`]+)`(?:\s.*)?$/m)?.[1]
    const stage = source.match(/^- current stage: `([^`]+)`(?:\s.*)?$/m)?.[1]

    if (activeChange === undefined || stage === undefined || !isValidStage(stage)) {
      return null
    }

    return { activeChange, stage }
  } catch {
    return null
  }
}

export function statusPointerConflict(currentState, statusPointer) {
  if (statusPointer === null) {
    return null
  }

  if (currentState.activeChange === statusPointer.activeChange && currentState.stage === statusPointer.stage) {
    return null
  }

  return {
    current: {
      activeChange: currentState.activeChange,
      stage: currentState.stage
    },
    status: statusPointer
  }
}
