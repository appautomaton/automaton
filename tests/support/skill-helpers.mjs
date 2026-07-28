// Shared fixtures and helpers for the skill-contract test suite.
// Resolves paths relative to this file (tests/support/), so callers in tests/ stay path-agnostic.
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { CONTENT_FIELDS } from '../../lib/contracts.mjs'

export const skillsRoot = fileURLToPath(new URL('../../skills', import.meta.url))
export const cliPath = fileURLToPath(new URL('../../bin/automaton.mjs', import.meta.url))

export const authoredSkills = [
  'auto-frame',
  'auto-plan',
  'auto-execute',
  'auto-verify',
  'auto-resume',
  'auto-eng-review'
]

export const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const perSkillScriptCommand = /`scripts\/(?:get-context|sync-status)\.mjs`/
// The content-track field vocabulary is data (contracts-data.json), so a rename in
// any stage reference is a failing test, not silent relay drift (pass 7).
export const contentDimensions = [...CONTENT_FIELDS.requiredCore, ...CONTENT_FIELDS.deferred]
export const antiSlopPatterns = [
  'Significance inflation',
  'Promotional language',
  'Superficial `-ing` padding',
  'Vague attribution',
  'Em-dash overuse',
  'Forced rule of three',
  'Sycophantic artifacts',
  'Generic conclusions',
  'Copula padding',
  'Signposting',
  'Unsupported specificity'
]

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/)

  assert.ok(match, 'expected YAML frontmatter')

  const [, rawFrontmatter, body] = match
  const fields = {}

  for (const line of rawFrontmatter.split('\n')) {
    const field = line.match(/^([a-z-]+):\s*(.*)$/)
    if (!field) {
      continue
    }

    const [, key, value] = field
    fields[key] = value
  }

  return {
    fields,
    body
  }
}
