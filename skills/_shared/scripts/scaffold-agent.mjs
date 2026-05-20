#!/usr/bin/env node
/**
 * scaffold-agent.mjs
 *
 * Creates the Automaton agent directory structure in the project root.
 * Idempotent: safe to run multiple times.
 *
 * Usage: node scaffold-agent.mjs [root=.]
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2] ?? '.'

const dirs = [
  join(root, '.agent'),
  join(root, '.agent', '.automaton'),
  join(root, '.agent', '.automaton', 'state'),
  join(root, '.agent', '.automaton', 'bin'),
  join(root, '.agent', '.automaton', 'lib'),
  join(root, '.agent', '.automaton', 'config'),
  join(root, '.agent', '.automaton', 'cache'),
  join(root, '.agent', '.automaton', 'logs'),
  join(root, '.agent', 'steering'),
  join(root, '.agent', 'wiki'),
  join(root, '.agent', 'work')
]

const created = []

for (const dir of dirs) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
    created.push(dir)
  }
}

// Seed current.json if absent
const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')
if (!existsSync(currentPath)) {
  writeFileSync(
    currentPath,
    JSON.stringify({ active_change: 'bootstrap', stage: 'frame' }, null, 2) + '\n',
    'utf8'
  )
  created.push(currentPath)
}

// Seed steering files if absent
const steeringFiles = {
  'PROJECT.md': '# Project\n\nDescribe the repo and why it exists.\n',
  'REQUIREMENTS.md': '# Requirements\n\nList the accepted product and technical constraints.\n',
  'ROADMAP.md': '# Roadmap\n\nNo roadmap phases yet.\n\nAdd phases only for user-approved roadmap decomposition, deferred SPEC scope, or repo-evident independent outcomes.\n\n## Deferred or Not Now\n\n- None recorded.\n',
  'STATUS.md': [
    '# Status',
    '',
    '## Current Change',
    '',
    '- active change: `bootstrap`',
    '- current stage: `frame`',
    '',
    '## What Is True Now',
    '',
    '- none recorded',
    '',
    '## Next Step',
    '',
    'Run `auto-onboard` to refresh project truth for the repository before continuing.',
    '',
    '## Open Risks',
    '',
    '- none recorded',
    ''
  ].join('\n')
}

const steeringRoot = join(root, '.agent', 'steering')
for (const [file, content] of Object.entries(steeringFiles)) {
  const target = join(steeringRoot, file)
  if (!existsSync(target)) {
    writeFileSync(target, content, 'utf8')
    created.push(target)
  }
}

console.log(JSON.stringify({ root, created }, null, 2))
