// Semicolon census: style ceiling, not a ban.
// Failure story: prose style drifts back one clause at a time. The corpus avoids
// semicolons unless no plainer separator works (table cells holding clause lists,
// parallel mappings with internal commas). The count may drop through edits but
// must not regrow without a conscious raise here, with the reason in the comment.
// 2026-07-28 baseline: 98 after the sweep; 19 of them are ARTIFACT-LIFECYCLE's
// handoff table, where periods would chop and commas would misgroup.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

const SEMICOLON_CEILING = 98

const markdownFiles = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath, entry.name))

test('corpus semicolon count stays under its ratchet ceiling', () => {
  const total = markdownFiles(skillsRoot).reduce(
    (sum, file) => sum + (readFileSync(file, 'utf8').match(/;/g) ?? []).length,
    0
  )
  assert.ok(
    total <= SEMICOLON_CEILING,
    `corpus has ${total} semicolons, ceiling ${SEMICOLON_CEILING}: use a period or colon where one works, or consciously raise the ceiling`
  )
})
