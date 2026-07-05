// auto-execute: route selection, subagent roles/prompts, execution windows.
// Failure story: execute is the only skill that mutates code, so its ownership rules (routes,
// windows, git rhythm, role and prompt separation) are where confusion costs the most. Role
// bodies live in role-sources/ and dispatch prompts carry only per-call slots so role tokens
// are not paid twice per dispatch.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'
import { SUBAGENT_STATUSES } from '../lib/contracts.mjs'

test('auto-execute provides subagent role sources and dispatch prompts', () => {
  const skillRoot = join(skillsRoot, 'auto-execute')
  const expectedFiles = [
    'role-sources/implementer-role.md',
    'role-sources/spec-reviewer-role.md',
    'role-sources/quality-reviewer-role.md',
    'references/implementer-prompt.md',
    'references/spec-reviewer-prompt.md',
    'references/quality-reviewer-prompt.md'
  ]

  for (const relativePath of expectedFiles) {
    assert.equal(existsSync(join(skillRoot, relativePath)), true, `${relativePath} must exist`)
  }

  // Role bodies are build inputs compiled into host-native agent files, not runtime
  // references. They live under role-sources/ and must never be duplicated into references/.
  for (const roleFile of ['implementer-role.md', 'spec-reviewer-role.md', 'quality-reviewer-role.md']) {
    assert.equal(
      existsSync(join(skillRoot, 'references', roleFile)),
      false,
      `${roleFile} must not live in references/ (it is a role-sources/ build input)`
    )
  }

  // The legacy code-quality-reviewer-prompt.md was renamed to quality-reviewer-prompt.md
  // to align with the host-native agent name `automaton-quality-reviewer`.
  assert.equal(
    existsSync(join(skillRoot, 'references', 'code-quality-reviewer-prompt.md')),
    false,
    'code-quality-reviewer-prompt.md must be renamed to quality-reviewer-prompt.md'
  )
})

test('auto-execute role files declare static role contracts', () => {
  const skillRoot = join(skillsRoot, 'auto-execute')
  const implementer = readFileSync(join(skillRoot, 'role-sources', 'implementer-role.md'), 'utf8')
  const specReviewer = readFileSync(join(skillRoot, 'role-sources', 'spec-reviewer-role.md'), 'utf8')
  const qualityReviewer = readFileSync(join(skillRoot, 'role-sources', 'quality-reviewer-role.md'), 'utf8')
  const roles = { implementer, specReviewer, qualityReviewer }

  // Each role carries the portable recursion guard. Recursion is also structurally blocked
  // on Claude Code and on Codex (via [features].multi_agent = false), but OpenCode subagents
  // can be granted permission.task, so the prose guard is load-bearing there and harmless
  // elsewhere.
  for (const [name, source] of Object.entries(roles)) {
    // Identity affirmation ("you are already the dispatched X") guards recursion
    // better than prohibition alone (DD-013); the explicit ban stays as backstop.
    assert.match(
      source,
      /You are already the dispatched/,
      `${name} role must affirm its dispatched identity`
    )
    assert.match(
      source,
      /Do not spawn another Automaton subagent/,
      `${name} role must forbid recursive subagent spawn`
    )
  }

  // Role-specific hard boundaries.
  assert.match(implementer, /Do not run any `git` write command/, 'implementer role must forbid git writes')
  assert.match(implementer, /subagents never touch history/, 'implementer role must restate the coordinator owns history')
  assert.match(implementer, /NEEDS_CONTEXT/)
  assert.match(implementer, /BLOCKED/)

  assert.match(specReviewer, /Do not edit code, tests, or any project artifacts/, 'spec reviewer role must forbid edits as portable intent')
  assert.match(specReviewer, /Do not trust the implementer report/, 'spec reviewer must require evidence before approval')
  assert.match(specReviewer, /Inspect actual changed files/)
  assert.match(specReviewer, /Do not perform general code-quality review/)

  assert.match(qualityReviewer, /Do not edit code, tests, or any project artifacts/, 'quality reviewer role must forbid edits as portable intent')
  assert.match(qualityReviewer, /critical/)
  assert.match(qualityReviewer, /important/)
  assert.match(qualityReviewer, /minor/)
  assert.match(qualityReviewer, /ISSUES: none/)

  // Status envelope vocabulary lives in role files, not in dispatch prompts, and is driven
  // by contracts-data.json (subagentStatuses) so it cannot drift from the protocol tables.
  assert.ok(implementer.includes(`STATUS: ${SUBAGENT_STATUSES.implementer.join(' | ')}`))
  assert.match(implementer, /FILES_CHANGED:/)
  assert.match(implementer, /SELF_REVIEW:/)
  assert.ok(specReviewer.includes(`STATUS: ${SUBAGENT_STATUSES.reviewer.join(' | ')}`))
  assert.match(specReviewer, /EVIDENCE:/)
  assert.ok(qualityReviewer.includes(`STATUS: ${SUBAGENT_STATUSES.reviewer.join(' | ')}`))
  assert.match(qualityReviewer, /EVIDENCE:/)

  // Role files must not carry per-call XML slot placeholders; those live in *-prompt.md.
  for (const [name, source] of Object.entries(roles)) {
    assert.doesNotMatch(
      source,
      /<slice>|<constraints>|<acceptance-criteria>|<implementation-summary>/,
      `${name} role must not contain per-call XML slots`
    )
  }
})

test('auto-execute dispatch prompts contain only per-call slots', () => {
  const skillRoot = join(skillsRoot, 'auto-execute')
  const prompts = {
    implementer: readFileSync(join(skillRoot, 'references', 'implementer-prompt.md'), 'utf8'),
    specReviewer: readFileSync(join(skillRoot, 'references', 'spec-reviewer-prompt.md'), 'utf8'),
    qualityReviewer: readFileSync(join(skillRoot, 'references', 'quality-reviewer-prompt.md'), 'utf8')
  }

  // XML slots remain in the prompt as runtime placeholders.
  assert.match(prompts.implementer, /<slice>[\s\S]*<\/slice>/)
  assert.match(prompts.implementer, /<constraints>[\s\S]*<\/constraints>/)
  assert.match(prompts.implementer, /<acceptance-criteria>[\s\S]*<\/acceptance-criteria>/)
  // The implementer also carries a re-dispatch feedback slot for the CHANGES_REQUESTED loop.
  assert.match(prompts.implementer, /<requested-changes>[\s\S]*<\/requested-changes>/)
  assert.match(prompts.specReviewer, /<slice>[\s\S]*<\/slice>/)
  assert.match(prompts.specReviewer, /<acceptance-criteria>[\s\S]*<\/acceptance-criteria>/)
  assert.match(prompts.specReviewer, /<implementation-summary>[\s\S]*<\/implementation-summary>/)
  assert.match(prompts.qualityReviewer, /<slice>[\s\S]*<\/slice>/)
  assert.match(prompts.qualityReviewer, /<implementation-summary>[\s\S]*<\/implementation-summary>/)

  for (const [name, source] of Object.entries(prompts)) {
    // Reusable role-body openings must move out of the per-call dispatch prompts.
    assert.doesNotMatch(
      source,
      /Your task is to implement exactly one Automaton plan slice/,
      `${name} prompt must not contain the implementer role-body opening`
    )
    assert.doesNotMatch(
      source,
      /Your task is spec compliance review/,
      `${name} prompt must not contain the spec-reviewer role-body opening`
    )
    assert.doesNotMatch(
      source,
      /Your task is code quality review/,
      `${name} prompt must not contain the quality-reviewer role-body opening`
    )

    // No role checklists in the per-call dispatch.
    assert.doesNotMatch(source, /Before you begin:/, `${name} prompt must not contain the Before-you-begin checklist`)
    assert.doesNotMatch(source, /While you work:/, `${name} prompt must not contain the While-you-work checklist`)
    assert.doesNotMatch(source, /Before reporting back, self-review/, `${name} prompt must not contain the self-review checklist`)
    assert.doesNotMatch(source, /Use severity labels for findings/, `${name} prompt must not contain the severity-labels checklist`)

    // No status envelope definitions in the per-call dispatch.
    assert.doesNotMatch(source, /^STATUS:/m, `${name} prompt must not declare a status envelope (lives in role file)`)
    assert.doesNotMatch(source, /Return exactly this structure/, `${name} prompt must not embed a return-structure block`)
  }
})

test('auto-execute owns route selection and execution-window continuation', () => {
  const source = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')

  assert.match(source, /Direct implementation and subagent implementation are two routes inside this skill/)
  assert.match(source, /Select Execution Window/)
  assert.match(source, /Continuation is the default after a verified slice/)
  assert.match(source, /An execution window is a context-management batch, not a completion boundary/)
  assert.match(source, /Always include the next uncompleted slice/)
  assert.match(source, /Checkpoint after: none/)
  assert.match(source, /defaults pinned in `\.agent\/\.automaton\/references\/ARTIFACT-LIFECYCLE\.md` \(Slice Defaults\)/)
  assert.match(source, /missing acceptance criteria or verification/)
  assert.match(source, /validate that it actually requires human input/)
  assert.match(source, /Do not pause for checkpoint text that only records verification findings/)
  assert.match(source, /Record a plan correction, keep the evidence, and continue/)
  assert.match(source, /Record completion evidence in place/)
  assert.match(source, /The slice status still updates in place/)
  assert.match(source, /If the slice is inline in `PLAN\.md`, update that slice entry in `PLAN\.md`/)
  assert.match(source, /If the slice has `Detail: slices\/slice-NNN\.md`, update that linked detail file/)
  assert.match(source, /Do not create separate execution evidence files by default/)
  assert.match(source, /\*\*Status:\*\* complete \| blocked \| needs-plan-correction/)
  assert.match(source, /Append-replace the evidence block/)
  assert.match(source, /Do not paste transcripts, full command logs, or source excerpts/)
  assert.match(source, /do not invent slice cursor or checkpoint fields/)
  assert.match(source, /The next slice is selected from `PLAN\.md`/)
  assert.match(source, /Execute the window serially by default/)
  assert.match(source, /Build an execution window, but execute and verify one slice at a time/)
  assert.match(source, /The route decision lives here/)
  assert.match(source, /Run the per-slice protocol/)
  assert.match(source, /Do not tell the user to invoke another execute skill/)
  assert.match(source, /continue inline into `auto-verify`'s contract/)
  assert.match(source, /Do not make the user run `auto-verify` manually/)
  assert.match(source, /Do not trust execute's own slice evidence as final verification/)
  assert.match(source, /return to \*\*Select Execution Window\*\* immediately/)
  assert.match(source, /"N slices remain" is progress state, not a stop reason/)
  assert.match(source, /Remaining approved slices require another execution-window pass/)
  // Slice 3: subagent route names host-native agents and forbids prompt-injection fallback.
  for (const agentName of ['automaton-implementer', 'automaton-spec-reviewer', 'automaton-quality-reviewer']) {
    assert.match(source, new RegExp(`\`${agentName}\``), `auto-execute must name ${agentName} in the Subagent Route`)
  }
  assert.match(source, /do not paste a role body into a generic worker or explorer agent/, 'auto-execute must forbid runtime role-body pasting')
  assert.match(source, /Do not fall back to runtime-curated prompt injection/, 'auto-execute must forbid runtime prompt-injection fallback')
})

test('auto-execute stop examples require bounded diagnostics before halting on uncertainty', () => {
  const source = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'stop-examples.md'), 'utf8')

  assert.match(source, /run one bounded diagnostic/)
  assert.doesNotMatch(source, /unsure after 30 seconds/)
})

test('auto-execute git rule carries the worktree carve-out and one attempt limit', () => {
  const source = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')
  const stopExamples = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'stop-examples.md'), 'utf8')
  const debugProtocol = readFileSync(join(skillsRoot, 'auto-execute', 'references', 'debug-protocol.md'), 'utf8')

  // The strictly-additive rule must name the coordinator-managed worktree carve-out
  // instead of contradicting the parallel-isolation mechanics in git-rhythm.md.
  assert.match(source, /carve-out: coordinator-managed `git worktree add`\/`remove`/)
  assert.match(source, /worktree carve-out in ARTIFACT-LIFECYCLE\.md/)

  // One attempt threshold across the STOP condition and both references: 3, then halt.
  assert.match(source, /A test fails 3 times with the same error/)
  assert.doesNotMatch(source, /> ?3 attempts/)
  assert.match(stopExamples, /A test fails 3 times with the same error/)
  assert.match(debugProtocol, /within 3 attempts/)
})
