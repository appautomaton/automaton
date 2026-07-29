// Prose-hygiene censuses: style ceilings, not bans.
// Failure story: prose style drifts back one clause at a time. The corpus avoids
// semicolons unless no plainer separator works (table cells holding clause lists,
// parallel mappings with internal commas). The count may drop through edits but
// must not regrow without a conscious raise here, with the reason in the comment.
// 2026-07-28 baseline: 98 after the sweep; 19 of them are ARTIFACT-LIFECYCLE's
// handoff table, where periods would chop and commas would misgroup.
// 2026-07-28 down-ratchet 98 -> 83: the redundancy sweep converted the remaining
// clause-joining semicolons in eight references to periods. Actual 83.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

const SEMICOLON_CEILING = 83

// The house style bans em-dashes outright (LEXICON.md, Prose Standard), so this is a
// ban rather than a ratchet. Failure story: the rule held everywhere in real prose and
// broke in exactly two places, both inside fabricated "Before:" slop samples in quality
// cards. A corpus that has to violate its own style to demonstrate bad style teaches the
// pattern it prohibits, and forces every future scan to special-case the harness's own
// files. The demonstration blocks are gone (DD-021) and the count is now zero. Keep it there.
const EM_DASH_CEILING = 0

// Numeric prescriptions ("escalate after 3 attempts", "under 200 lines") are legitimate
// when the number carries its inference or fixes an output shape, and slop when it is
// invented to dramatize a rule. ANTI-SLOP.md calls the bad kind Unsupported specificity.
// The harness shipped one for months: "compress 500 lines of evidence into 5 lines of
// conclusion", a ratio nobody measured, in the file teaching context discipline. No regex
// can separate the two kinds, so this counts instead. A raise is a decision, made here,
// with the number's inference written into the comment.
// 2026-07-28 baseline: 12 after the sweep. All 12 either carry an inference (3 failed
// attempts means the mental model is wrong) or fix a shape (an 8-word handoff reason).
const NUMERIC_PRESCRIPTION_CEILING = 12
const NUMERIC_PRESCRIPTION = /[0-9]+[ -]+(lines|words|files|attempts|rounds|results|sentences|months|times)/g

const markdownFiles = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath, entry.name))

const countAcrossCorpus = (pattern) =>
  markdownFiles(skillsRoot).reduce(
    (sum, file) => sum + (readFileSync(file, 'utf8').match(pattern) ?? []).length,
    0
  )

test('corpus semicolon count stays under its ratchet ceiling', () => {
  const total = countAcrossCorpus(/;/g)
  assert.ok(
    total <= SEMICOLON_CEILING,
    `corpus has ${total} semicolons, ceiling ${SEMICOLON_CEILING}: use a period or colon where one works, or consciously raise the ceiling`
  )
})

test('corpus ships no em-dashes, including inside examples', () => {
  const offenders = markdownFiles(skillsRoot)
    .map((file) => [file, (readFileSync(file, 'utf8').match(/—/g) ?? []).length])
    .filter(([, count]) => count > 0)

  const total = offenders.reduce((sum, [, count]) => sum + count, 0)
  assert.ok(
    total <= EM_DASH_CEILING,
    `corpus has ${total} em-dashes, ceiling ${EM_DASH_CEILING}: use a comma, period, or colon. ` +
      `An example that demonstrates bad style is not an exemption. Offenders: ${offenders.map(([file]) => file).join(', ')}`
  )
})

test('numeric prescriptions stay under their ratchet ceiling', () => {
  const total = countAcrossCorpus(NUMERIC_PRESCRIPTION)
  assert.ok(
    total <= NUMERIC_PRESCRIPTION_CEILING,
    `corpus has ${total} numeric prescriptions, ceiling ${NUMERIC_PRESCRIPTION_CEILING}: ` +
      `state the instruction without inventing a count, or raise the ceiling here and write the number's inference into the comment`
  )
})
