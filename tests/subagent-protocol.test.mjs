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

test('dispatch packet list and implementer slot template name the same per-call items', () => {
  const protocol = readFileSync(join(skillsRoot, '_shared', 'references', 'SUBAGENT-PROTOCOL.md'), 'utf8')
  const implementerPrompt = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'implementer-prompt.md'), 'utf8')
  const executeSkill = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')
  const contentExecution = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'content-execution.md'), 'utf8')

  // Edit scope is a protocol requirement, so the slot template must carry it.
  assert.match(protocol, /edit scope: files or directories the implementer may modify/)
  assert.match(implementerPrompt, /<edit-scope>/)
  assert.match(implementerPrompt, /Unlisted paths are read-only/)

  // Role identity, status vocabulary, and return envelope live in the installed role
  // bodies. The packet list must not re-send them per call.
  assert.match(protocol, /The installed role body already carries identity, status vocabulary, and the return envelope/)
  assert.doesNotMatch(protocol, /- role and requested status vocabulary/)
  assert.doesNotMatch(protocol, /- expected output structure/)

  // NEEDS_CONTEXT is an implementer-to-coordinator status only, never a
  // coordinator-to-user stop label.
  assert.doesNotMatch(executeSkill, /stop with `NEEDS_CONTEXT`/)
  assert.doesNotMatch(contentExecution, /NEEDS_CONTEXT/)
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

// DD-013 coordination doctrine: evidence over signals, triaged blockers, and
// structurally isolated parallel writes. These are the rules that keep a
// multi-agent run recoverable when a host drops a signal or a plan's
// parallel-safe claim turns out wrong.
test('protocol pins evidence-over-signal completion and BLOCKED triage', () => {
  const protocol = readFileSync(join(skillsRoot, '_shared', 'references', 'SUBAGENT-PROTOCOL.md'), 'utf8')

  assert.match(protocol, /## Completion Is Evidence, Not Signal/)
  assert.match(protocol, /working tree is the authority/)
  assert.match(protocol, /instead of blocking on the signal/, 'a dropped signal with a verifiable deliverable must not block')
  assert.match(protocol, /never re-dispatch unchanged work/i, 'BLOCKED triage must forbid hope-driven retries')
  assert.match(protocol, /returns to `auto-plan` to split/, 'too-large slices route back to planning')
})

test('parallel dispatch requires worktree isolation with serial integration', () => {
  const protocol = readFileSync(join(skillsRoot, '_shared', 'references', 'SUBAGENT-PROTOCOL.md'), 'utf8')
  const rhythm = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'git-rhythm.md'), 'utf8')
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(protocol, /## Parallel Isolation/)
  assert.match(protocol, /one worktree per parallel implementer/)
  assert.match(rhythm, /scratch isolation, not a branching strategy/)
  assert.match(rhythm, /plan's parallel-safe claim was wrong/, 'apply conflicts escalate to a plan correction, never a hand-merge')
  // The carve-out must live next to the additive rule it qualifies, so the two
  // cannot drift into contradiction.
  assert.match(lifecycle, /Never `amend`, `reset`, `rebase`, `branch`, `checkout`, or `push`(.|\n)*worktree add(.|\n)*never switched/)
})

test('role bodies carry identity affirmation, escalation permission, and the harness boundary', () => {
  const roleDir = join(skillsRoot, 'auto-execute', 'role-sources')
  for (const role of ['implementer-role.md', 'spec-reviewer-role.md', 'quality-reviewer-role.md']) {
    const body = readFileSync(join(roleDir, role), 'utf8')
    assert.match(body, /You are already the dispatched/, `${role} must use identity affirmation for its recursion guard`)
    assert.match(body, /installed harness machinery/, `${role} must carry the harness-internals boundary`)
  }
  const implementer = readFileSync(join(roleDir, 'implementer-role.md'), 'utf8')
  assert.match(implementer, /Bad work is worse than no work/, 'the implementer must have explicit permission to escalate')
})
