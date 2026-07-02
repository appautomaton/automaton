import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { VERDICT_ROUTING } from '../lib/contracts.mjs'

// Review verdict routing is a two-way prose contract: auto-eng-review renders a verdict
// table, and ARTIFACT-LIFECYCLE.md carries the cross-skill routing table that downstream
// skills consult. Nothing at runtime enforces the verdict -> next-skill mapping, so a
// silent edit in either place would re-route the lifecycle with no failing test. These
// tests pin both prose tables to contracts-data.json. Product direction has no review
// skill: the user approves SPEC.md at frame's exit (see FRAMEWORK.md Handoff Model).

const skillsRoot = fileURLToPath(new URL('../skills', import.meta.url))
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

test('auto-eng-review verdict table routes match contracts-data.json', () => {
  for (const [verdict, skills] of Object.entries(VERDICT_ROUTING.engineering)) {
    const row = verdictRow(engSkill, verdict, 'auto-eng-review')
    for (const skill of skills) {
      assert.ok(row.includes(skill), `auto-eng-review ${verdict} row must route to ${skill}`)
    }
  }
})

test('lifecycle verdict routing table matches contracts-data.json', () => {
  for (const [verdict, skills] of Object.entries(VERDICT_ROUTING.engineering)) {
    const row = lifecycleRow('auto-eng-review', verdict)
    for (const skill of skills) {
      assert.ok(row.includes(skill), `lifecycle auto-eng-review ${verdict} row must route to ${skill}`)
    }
  }
})

test('no product verdict routing survives in contracts or lifecycle prose', () => {
  assert.equal(VERDICT_ROUTING.product, undefined, 'product routing must not return to contracts-data.json')
  assert.doesNotMatch(lifecycle, /auto-ceo-review/, 'lifecycle prose must not route through the removed product review skill')
})
