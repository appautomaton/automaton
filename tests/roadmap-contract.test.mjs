// ROADMAP-CONTRACT.md: roadmap phase authorship invariants.
// Failure story: a narrowed SPEC promoted into roadmap phases legitimizes scope loss as
// planning. Phase authorship stays with user-approved office-hours decomposition only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

test('scope narrowing is not legitimized by promoting scope to a ROADMAP phase', () => {
  const frame = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')
  const contract = readFileSync(join(skillsRoot, '_shared', 'references', 'ROADMAP-CONTRACT.md'), 'utf8')
  const officeHours = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const primeDirectives = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'prime-directives.md'), 'utf8')

  // The escape-hatch phrasings that let a narrowing skill record deferred scope as a roadmap
  // phase must stay gone. Roadmap is a steering surface, not a holding bin for a shrunk SPEC.
  assert.doesNotMatch(
    frame,
    /record the narrowing as decomposition with deferred scope in[^\n]*ROADMAP/i,
    'auto-frame must not route a narrowed SPEC into ROADMAP.md'
  )
  assert.doesNotMatch(
    lifecycle,
    /record the deferred scope in `\.agent\/steering\/ROADMAP\.md`/i,
    'ARTIFACT-LIFECYCLE must not route narrowing into ROADMAP.md'
  )
  assert.doesNotMatch(
    contract,
    /Appends deferred scope as `status: pending` phases/,
    'ROADMAP-CONTRACT must not let auto-frame append pending phases'
  )
  assert.doesNotMatch(
    contract,
    /\| `pending` \|[^\n]*`auto-frame`/,
    'auto-frame must not be listed as a pending-phase setter'
  )

  // auto-frame keeps the safe alternatives and an explicit ban on phase creation from a narrowed spec.
  assert.match(frame, /widen the SPEC, ask for confirmation/)
  assert.match(frame, /Do not create `ROADMAP\.md` phases from a narrowed SPEC/)
  assert.match(frame, /Silent narrowing is a framing failure/)

  // Phase authorship is reserved for a user-approved office-hours decomposition.
  assert.match(lifecycle, /roadmap phases come only from a user-approved `auto-office-hours` decomposition/)
  assert.match(contract, /`auto-frame` \| Does not create roadmap phases/)
  assert.match(contract, /`auto-frame` does not create roadmap phases/)
  assert.match(officeHours, /the user has approved a phased decomposition/)

  // auto-eng-review is not a roadmap writer; deferred work it surfaces lives in the plan or review action.
  assert.doesNotMatch(
    primeDirectives,
    /approved plan, roadmap, or review action/,
    'auto-eng-review must not list roadmap as a deferred-work surface'
  )
})
