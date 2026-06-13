// SUBAGENT-PROTOCOL.md dispatch contract and the shared ANTI-SLOP taxonomy.
// Failure story: a protocol that lets a coordinator paste role bodies into generic agents
// bypasses the installed read-only and no-git role boundaries (DD-008). Named-agent dispatch
// and curated packets are the load-bearing rules here.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot, antiSlopPatterns, escapeRegExp } from './support/skill-helpers.mjs'
import { SUBAGENT_STATUSES } from '../lib/contracts.mjs'

test('shared references include protocol references but no host-specific generated mapping', () => {
  assert.equal(existsSync(join(skillsRoot, '_shared', 'references', 'SUBAGENT-PROTOCOL.md')), true)
  assert.equal(existsSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md')), true)
  assert.equal(existsSync(join(skillsRoot, '_shared', 'references', 'ANTI-SLOP.md')), true)
  assert.equal(existsSync(join(skillsRoot, '_shared', 'references', 'HOST-TOOLS.md')), false)
})

test('shared anti-slop reference is the canonical content pattern taxonomy', () => {
  const antiSlop = readFileSync(join(skillsRoot, '_shared', 'references', 'ANTI-SLOP.md'), 'utf8')

  for (const pattern of antiSlopPatterns) {
    assert.match(antiSlop, new RegExp(escapeRegExp(pattern)))
  }

  assert.match(antiSlop, /quoted source text/)
  assert.match(antiSlop, /approved voice/)
  assert.match(antiSlop, /intentionally justified/)
})

test('subagent protocol defines dispatch packets and bounded review loops', () => {
  const protocol = readFileSync(join(skillsRoot, '_shared', 'references', 'SUBAGENT-PROTOCOL.md'), 'utf8')

  assert.match(protocol, /## Dispatch Packet/)
  assert.match(protocol, /Subagents receive curated slice context/)
  assert.match(protocol, /`auto-execute` owns execute-stage orchestration across slices/)
  assert.match(protocol, /Cross-slice parallel dispatch is allowed only when `PLAN\.md` explicitly marks slices parallel-safe/)
  assert.match(protocol, /write sets are disjoint/)
  assert.match(protocol, /Use orchestration artifacts only for subagent routes or complex review loops/)
  assert.match(protocol, /Write the summary first/)
  assert.match(protocol, /Future coordinators should read `slice-NNN-summary\.md`/)
  assert.match(protocol, /Role files are optional/)
  assert.match(protocol, /Never paste full source files, full command logs, or chat transcripts/)
  assert.match(protocol, /one targeted correction/)
  assert.match(protocol, /reviewer requests changes twice/)
  assert.match(protocol, /Do not invent a universal SDK or CLI/)

  // Slice 3: the protocol names host-native agents and forbids role-body prompt injection.
  assert.match(protocol, /This file does not author role system prompts/, 'protocol must declare it does not author static role bodies')
  assert.match(protocol, /Host-native agent/, 'Roles table must include a Host-native agent column')
  for (const agentName of ['automaton-implementer', 'automaton-spec-reviewer', 'automaton-quality-reviewer']) {
    assert.match(protocol, new RegExp(`\`${agentName}\``), `protocol must name ${agentName}`)
  }
  assert.match(protocol, /Dispatch only by named host-native agent/, 'protocol must require named-agent dispatch')
  assert.match(protocol, /Do not paste a role body into a generic worker/, 'protocol must forbid runtime role-body pasting')
  assert.match(protocol, /Do not fall back to runtime-curated prompt injection/, 'protocol must forbid runtime prompt-injection fallback')
  // Retain the host-unavailable stop condition.
  assert.match(protocol, /Host does not expose subagent support/, 'protocol must retain the host-unavailable STOP condition')
})

test('subagent status vocabulary is the same set on every end', () => {
  // The coordinator routes on these exact strings: the protocol tables tell it what each
  // status means, and the role envelopes tell subagents what they may return. If either end
  // renames a status, the coordinator's routing silently stops matching, so both ends are
  // asserted from the single vocabulary in contracts-data.json (subagentStatuses).
  const protocol = readFileSync(join(skillsRoot, '_shared', 'references', 'SUBAGENT-PROTOCOL.md'), 'utf8')
  const roleSources = join(skillsRoot, 'auto-execute', 'role-sources')
  const implementerRole = readFileSync(join(roleSources, 'implementer-role.md'), 'utf8')
  const reviewerRoles = [
    readFileSync(join(roleSources, 'spec-reviewer-role.md'), 'utf8'),
    readFileSync(join(roleSources, 'quality-reviewer-role.md'), 'utf8')
  ]

  for (const status of [...SUBAGENT_STATUSES.implementer, ...SUBAGENT_STATUSES.reviewer]) {
    assert.match(protocol, new RegExp(`\\|\\s*\`${status}\``), `protocol status tables must define ${status}`)
  }

  assert.ok(
    implementerRole.includes(`STATUS: ${SUBAGENT_STATUSES.implementer.join(' | ')}`),
    'implementer role envelope must offer exactly the implementer status vocabulary'
  )
  for (const role of reviewerRoles) {
    assert.ok(
      role.includes(`STATUS: ${SUBAGENT_STATUSES.reviewer.join(' | ')}`),
      'reviewer role envelopes must offer exactly the reviewer status vocabulary'
    )
  }
})
