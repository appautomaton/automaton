#!/usr/bin/env node
/**
 * sync-status.mjs
 *
 * Reads current.json and updates STATUS.md frontmatter and body pointers.
 * If STATUS.md does not exist, creates a minimal status summary.
 *
 * Usage: node sync-status.mjs [root=.]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const STAGES = new Set(['frame', 'plan', 'execute', 'verify', 'resume'])
const DEFAULT_NEXT_STEP = 'Run `auto-onboard` to refresh project truth for the repository before continuing.'

function renderStatusBody(activeChange, stage) {
  return [
    '# Status',
    '',
    '## Current Change',
    '',
    `- active change: \`${activeChange}\``,
    `- current stage: \`${stage}\``,
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

function renderCurrentChangeSection(activeChange, stage) {
  return [
    '## Current Change',
    '',
    `- active change: \`${activeChange}\``,
    `- current stage: \`${stage}\``
  ].join('\n')
}

function splitFrontmatter(source) {
  const match = source.match(/^---\n[\s\S]*?\n---\n*/)

  if (!match) {
    return { body: source }
  }

  return { body: source.slice(match[0].length) }
}

function updateStatusBody(body, activeChange, stage) {
  if (body.trim().length === 0) {
    return renderStatusBody(activeChange, stage)
  }

  const currentChange = renderCurrentChangeSection(activeChange, stage)
  const currentChangePattern = /## Current Change\n\n[\s\S]*?(?=\n## |$)/
  const currentChangeMatch = body.match(currentChangePattern)

  if (currentChangeMatch) {
    let nextSection = currentChangeMatch[0]

    if (/^- active change: `[^`]*`$/m.test(nextSection)) {
      nextSection = nextSection.replace(/^- active change: `[^`]*`$/m, `- active change: \`${activeChange}\``)
    } else {
      nextSection = nextSection.replace('## Current Change\n\n', `## Current Change\n\n- active change: \`${activeChange}\`\n`)
    }

    if (/^- current stage: `[^`]*`$/m.test(nextSection)) {
      nextSection = nextSection.replace(/^- current stage: `[^`]*`$/m, `- current stage: \`${stage}\``)
    } else {
      nextSection = nextSection.replace(
        `- active change: \`${activeChange}\`\n`,
        `- active change: \`${activeChange}\`\n- current stage: \`${stage}\`\n`
      )
    }

    return body.replace(currentChangeMatch[0], nextSection)
  }

  const withPointers = body
    .replace(/^- active change: `[^`]*`$/m, `- active change: \`${activeChange}\``)
    .replace(/^- current stage: `[^`]*`$/m, `- current stage: \`${stage}\``)

  if (
    withPointers.includes(`- active change: \`${activeChange}\``) &&
    withPointers.includes(`- current stage: \`${stage}\``)
  ) {
    return withPointers
  }

  if (body.startsWith('# Status\n')) {
    return body.replace('# Status\n', `# Status\n\n${currentChange}\n`)
  }

  return `${renderStatusBody(activeChange, stage)}\n${body}`
}

const root = process.argv[2] ?? '.'
const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')
const statusPath = join(root, '.agent', 'steering', 'STATUS.md')

let currentState

try {
  currentState = JSON.parse(readFileSync(currentPath, 'utf8'))
} catch (err) {
  console.error(JSON.stringify({ error: `Cannot read current.json: ${err.message}` }))
  process.exit(1)
}

const activeChange = currentState.active_change ?? currentState.activeChange ?? 'none'
const stage = currentState.stage ?? 'none'

if (!STAGES.has(stage)) {
  console.error(JSON.stringify({ error: `invalid stage: ${stage}` }))
  process.exit(1)
}

const statusContent = existsSync(statusPath)
  ? readFileSync(statusPath, 'utf8')
  : ''

const frontmatter = `---
active_change: ${activeChange}
stage: ${stage}
---`

const { body } = splitFrontmatter(statusContent)
const nextBody = updateStatusBody(body, activeChange, stage)
const newContent = `${frontmatter}\n\n${nextBody.replace(/^\n+/, '')}`

mkdirSync(dirname(statusPath), { recursive: true })
writeFileSync(statusPath, newContent, 'utf8')

console.log(JSON.stringify({
  synced: true,
  statusPath,
  active_change: activeChange,
  stage
}, null, 2))
