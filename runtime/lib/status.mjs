import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

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
  if (summary.nextStep === undefined || summary.nextStep.trim().length === 0) {
    throw new Error('invalid status summary: missing next step')
  }

  return {
    whatIsTrueNow: normalizeBulletList(summary.whatIsTrueNow ?? []),
    nextStep: summary.nextStep.trim(),
    openRisks: normalizeBulletList(summary.openRisks ?? [])
  }
}

function parseStatusSummary(source) {
  return validateStatusSummary({
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
