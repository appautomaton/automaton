// auto-plan: lean slice defaults and requirement traceability.
// Failure story: PLAN.md is the reloadable execution index. If defaults bloat into per-slice
// boilerplate or traceable IDs collapse into prose, execute loses its contract (slice field
// labels are pinned in contracts-data.json, see artifact-lint.test.mjs).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

test('plan execute and verify preserve linked detail and traceability IDs', () => {
  const plan = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')
  const execute = readFileSync(join(skillsRoot, 'auto-execute', 'SKILL.md'), 'utf8')
  const verify = readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')

  assert.match(plan, /slices\/slice-NNN\.md/)
  assert.match(plan, /Requirement traceability/)
  assert.match(plan, /gap IDs/)
  assert.match(plan, /Do not collapse traceable requirements into untraceable prose/)
  assert.match(execute, /linked detail files and traceability IDs/)
  assert.match(execute, /load those linked files for the active slice/)
  assert.match(verify, /Linked detail file and traceability IDs/)
  assert.match(verify, /unlinked supplemental file/)
})

test('auto-plan gates the PLAN.md write before the write instructions', () => {
  const source = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')

  const gateIndex = source.indexOf('<GATE>')
  const writeIndex = source.indexOf('### Write PLAN.md')
  assert.ok(gateIndex > -1 && writeIndex > -1, 'auto-plan must keep its GATE and Write PLAN.md sections')
  assert.ok(gateIndex < writeIndex, 'the GATE must precede the artifact write it gates (FRAMEWORK.md hard-stop placement)')
})

test('auto-plan preserves review sections and never replaces them as producer', () => {
  const source = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')

  assert.match(source, /Preserve existing `## Review:` sections on re-run/)
  assert.match(source, /Preserve review sections on refresh/)
  assert.doesNotMatch(source, /Replace prior `## Review:`/)
})

test('auto-plan defines lean slice defaults without dropping execution safety', () => {
  const source = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')

  assert.match(source, /Artifact discipline: `PLAN\.md` is the reloadable execution index/)
  assert.match(source, /Bounded: it can be executed and verified without loading unrelated slices/)
  assert.match(source, /\*\*Execution:\*\* direct \| subagent recommended \| subagent required/)
  assert.match(source, /\*\*Checkpoint after:\*\* none \| human-verify \| decision \| human-action/)
  assert.match(source, /Required:/)
  assert.match(source, /Defaults, state only when overriding:/)
  assert.match(source, /Include when useful:/)
  assert.match(source, /Every material slice must have acceptance criteria/)
  assert.match(source, /Omitted `Execution` means `direct`/)
  assert.match(source, /Omitted `Checkpoint after` means `none`/)
  assert.match(source, /Execution routing and topology/)
  assert.match(source, /default continuation path/)
  assert.match(source, /Parallel-safe means dependencies are independent and write sets are disjoint/)
  assert.match(source, /Continuation is the default/)
  assert.match(source, /execution should continue through all approved slices/)
  assert.match(source, /execution windows are context-management batches, not planned stopping points/)
  assert.match(source, /Verification findings, implementation caveats, downstream consequences, and next-slice recommendations are not checkpoints/)
  assert.doesNotMatch(source, /\*\*Context budget:\*\*/)
  assert.doesNotMatch(source, /Context budget for this change/)
  assert.doesNotMatch(source, /known fraction of the context window/)
  assert.doesNotMatch(source, /~X% of context window/)
})

// DESIGN.md earns existence by a three-condition test, not taste. One condition
// missing means the rationale is small enough to live in PLAN.md prose, and a
// standing document would just be a second home for it.
test('auto-plan gates DESIGN.md on the three-condition test', () => {
  const source = readFileSync(join(skillsRoot, 'auto-plan', 'SKILL.md'), 'utf8')

  assert.match(source, /hard to reverse/)
  assert.match(source, /surprised without context/)
  assert.match(source, /a real trade-off between genuine alternatives/)
  assert.match(source, /Any one missing means the rationale lives in PLAN\.md prose/)
  assert.doesNotMatch(source, /only for non-trivial architecture or new patterns/)
})
