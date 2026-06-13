import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { VERDICT_ROUTING } from '../lib/contracts.mjs'

// Review verdict routing is a three-way prose contract: auto-ceo-review and auto-eng-review
// each render a verdict table, and ARTIFACT-LIFECYCLE.md carries the cross-skill routing
// table that downstream skills consult. Nothing at runtime enforces the verdict -> next-skill
// mapping, so a silent edit in any one place would re-route the lifecycle with no failing
// test. These tests pin all three prose tables to contracts-data.json.

const skillsRoot = fileURLToPath(new URL('../skills', import.meta.url))
const ceoSkill = readFileSync(join(skillsRoot, 'auto-ceo-review', 'SKILL.md'), 'utf8')
const engSkill = readFileSync(join(skillsRoot, 'auto-eng-review', 'SKILL.md'), 'utf8')
const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

function verdictRow(source, verdict, context) {
  const pattern = new RegExp(`\\|\\s*\`${verdict}\`\\s*\\|`)
  const row = source.split('\n').find((line) => pattern.test(line))
  assert.ok(row, `${context} must render a table row for verdict ${verdict}`)
  return row
}

function lifecycleRow(reviewSkill, verdict) {
  const pattern = new RegExp(`\\|\\s*\`${reviewSkill}\`\\s*\\|\\s*\`${verdict}\`\\s*\\|`)
  const row = lifecycle.split('\n').find((line) => pattern.test(line))
  assert.ok(row, `ARTIFACT-LIFECYCLE.md routing table must carry ${reviewSkill} / ${verdict}`)
  return row
}

test('auto-ceo-review verdict table routes match contracts-data.json', () => {
  for (const [verdict, skills] of Object.entries(VERDICT_ROUTING.product)) {
    const row = verdictRow(ceoSkill, verdict, 'auto-ceo-review')
    for (const skill of skills) {
      assert.ok(row.includes(skill), `auto-ceo-review ${verdict} row must route to ${skill}`)
    }
  }
})

test('auto-eng-review verdict table routes match contracts-data.json', () => {
  for (const [verdict, skills] of Object.entries(VERDICT_ROUTING.engineering)) {
    const row = verdictRow(engSkill, verdict, 'auto-eng-review')
    for (const skill of skills) {
      assert.ok(row.includes(skill), `auto-eng-review ${verdict} row must route to ${skill}`)
    }
  }
})

test('lifecycle verdict routing table matches contracts-data.json', () => {
  const reviews = [
    ['auto-ceo-review', VERDICT_ROUTING.product],
    ['auto-eng-review', VERDICT_ROUTING.engineering]
  ]
  for (const [reviewSkill, routing] of reviews) {
    for (const [verdict, skills] of Object.entries(routing)) {
      const row = lifecycleRow(reviewSkill, verdict)
      for (const skill of skills) {
        assert.ok(row.includes(skill), `lifecycle ${reviewSkill} ${verdict} row must route to ${skill}`)
      }
    }
  }
})
