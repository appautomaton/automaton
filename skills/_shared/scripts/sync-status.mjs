#!/usr/bin/env node
/**
 * sync-status.mjs
 *
 * Ensures STATUS.md has the compact prose summary shape.
 * If STATUS.md does not exist, creates a minimal status summary.
 * Legacy current.json mirror sections are removed; current.json remains
 * the only machine cursor for active change and stage.
 *
 * Usage: node sync-status.mjs [root=.]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadContracts() {
  const candidates = [
    resolve(__dirname, '..', 'lib', 'contracts-data.json'),
    resolve(__dirname, '..', '..', '..', 'lib', 'contracts-data.json'),
    resolve(__dirname, '..', '..', '..', 'runtime', 'lib', 'contracts-data.json'),
    join(process.cwd(), '.agent', '.automaton', 'lib', 'contracts-data.json')
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      try { return JSON.parse(readFileSync(p, 'utf8')) } catch { /* next */ }
    }
  }
  return null
}

const contracts = loadContracts()
const DEFAULT_NEXT_STEP = contracts?.defaultNextStep ?? 'Run `auto-onboard` to refresh project truth for the repository before continuing.'

function renderStatusBody() {
  return [
    '# Status',
    '',
    '## What Is True Now',
    '',
    '- none recorded',
    '',
    '## Next Step',
    '',
    DEFAULT_NEXT_STEP,
    '',
    '## Open Risks',
    '',
    '- none recorded',
    ''
  ].join('\n')
}

function splitFrontmatter(source) {
  const match = source.match(/^---\n[\s\S]*?\n---\n*/)

  if (!match) {
    return { body: source }
  }

  return { body: source.slice(match[0].length) }
}

function removeLegacyCurrentChange(body) {
  return body
    .replace(/## Current Change\n\n[\s\S]*?(?=\n## |$)/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function ensureSection(body, heading, fallback) {
  if (body.includes(`## ${heading}\n`)) {
    return body
  }

  return `${body.trimEnd()}\n\n## ${heading}\n\n${fallback}`
}

function updateStatusBody(body) {
  if (body.trim().length === 0) {
    return renderStatusBody()
  }

  let next = removeLegacyCurrentChange(body)

  if (!/^# Status(?:\n|$)/.test(next)) {
    next = `# Status\n\n${next}`
  }

  if (!next.includes('## What Is True Now\n') && !next.includes('## Next Step\n') && !next.includes('## Open Risks\n')) {
    return renderStatusBody()
  }

  next = ensureSection(next, 'What Is True Now', '- none recorded')
  next = ensureSection(next, 'Next Step', DEFAULT_NEXT_STEP)
  next = ensureSection(next, 'Open Risks', '- none recorded')

  return `${next.trim()}\n`
}

const root = process.argv[2] ?? '.'
const statusPath = join(root, '.agent', 'steering', 'STATUS.md')

const statusContent = existsSync(statusPath)
  ? readFileSync(statusPath, 'utf8')
  : ''

const { body } = splitFrontmatter(statusContent)
const nextBody = updateStatusBody(body)
const newContent = nextBody.replace(/^\n+/, '')

mkdirSync(dirname(statusPath), { recursive: true })
writeFileSync(statusPath, newContent, 'utf8')

console.log(JSON.stringify({
  synced: true,
  statusPath
}, null, 2))
