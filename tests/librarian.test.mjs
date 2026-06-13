// automaton-librarian: a read-only, cross-stage codebase explorer compiled as a 4th role.
// Failure story: without a structurally read-only lookup, wide exploration lands in the
// coordinator's context window or, worse, in an agent that can edit (LIBRARIAN.md, DD-008).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'
import { SUBAGENT_ROLES } from '../lib/install.mjs'

test('librarian is registered as a read-only explore role on the light model tier', () => {
  const librarian = SUBAGENT_ROLES.find((role) => role.agentName === 'automaton-librarian')
  assert.ok(librarian, 'automaton-librarian must be in SUBAGENT_ROLES')
  assert.equal(librarian.intent, 'explore', 'librarian must use the read-only explore intent')
  assert.equal(librarian.modelTier, 'light', 'librarian must request the light model tier')
  // Anything not 'edit' renders read-only on every host, so explore must never be 'edit'.
  assert.notEqual(librarian.intent, 'edit')
})

test('librarian role source is read-only, non-spawning, and returns a bounded envelope', () => {
  const body = readFileSync(join(skillsRoot, 'auto-execute', 'role-sources', 'librarian-role.md'), 'utf8')

  assert.match(body, /Read-only/)
  assert.match(body, /Never edit, create, or delete files/)
  assert.match(body, /Do not spawn another Automaton subagent/, 'librarian must carry the recursion guard')
  assert.match(body, /Return evidence, not decisions/i, 'librarian must return evidence, not decisions')
  assert.match(body, /STATUS: FOUND \| PARTIAL \| NOT_FOUND/)
  for (const field of ['ANSWER:', 'FILES:', 'RELATIONSHIPS:', 'UNCERTAINTY:', 'NEXT_READS:']) {
    assert.match(body, new RegExp(field), `return envelope must include ${field}`)
  }
})

test('LIBRARIAN.md defines a one-shot read-only lookup contract', () => {
  const doc = readFileSync(join(skillsRoot, '_shared', 'references', 'LIBRARIAN.md'), 'utf8')

  assert.match(doc, /one-shot lookup, not the per-slice subagent protocol/)
  assert.match(doc, /Structurally read-only on every host/)
  assert.match(doc, /not a silent fallback to the parent model/, 'must reject silent model fallback')
  assert.match(doc, /returns evidence, never decisions/)
  assert.match(doc, /<question>/, 'must show the dispatch question slot')
  assert.match(doc, /automaton-librarian/)
})

test('lifecycle skills offer the librarian as an opt-in read-only lookup', () => {
  // LIBRARIAN.md grants dispatch to all four stages that risk wide reads.
  // Execute is included: tracing a flow before editing is exactly where
  // exploration would otherwise blow up the coordinator's context.
  for (const skill of ['auto-office-hours', 'auto-frame', 'auto-plan', 'auto-execute']) {
    const source = readFileSync(join(skillsRoot, skill, 'SKILL.md'), 'utf8')
    assert.match(source, /automaton-librarian/, `${skill} must mention the librarian`)
    assert.match(source, /references\/LIBRARIAN\.md/, `${skill} must point to LIBRARIAN.md`)
    assert.match(source, /you keep the decision/, `${skill} must frame the librarian as opt-in evidence, not a decision-maker`)
  }
})
