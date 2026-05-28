// Shared fixtures and helpers for the skill-contract test suite.
// Resolves paths relative to this file (tests/support/), so callers in tests/ stay path-agnostic.
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

export const skillsRoot = fileURLToPath(new URL('../../skills', import.meta.url))
export const cliPath = fileURLToPath(new URL('../../bin/automaton.mjs', import.meta.url))

export const authoredSkills = [
  'auto-onboard',
  'auto-frame',
  'auto-plan',
  'auto-execute',
  'auto-verify',
  'auto-resume',
  'auto-office-hours',
  'auto-ceo-review',
  'auto-eng-review'
]

export const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const perSkillScriptCommand = /`scripts\/(?:get-context|sync-status)\.mjs`/
export const contentDimensions = ['Audience', 'Thesis', 'Voice', 'Content Anti-Goals', 'Channel', 'Source Policy', 'Factual Risk', 'Format']
export const antiSlopPatterns = [
  'Significance inflation',
  'Promotional language',
  'Superficial `-ing` analysis',
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
