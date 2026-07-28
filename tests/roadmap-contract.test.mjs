// ROADMAP-CONTRACT.md: roadmap phase authorship invariants.
// Failure story: a narrowed SPEC promoted into roadmap phases legitimizes scope loss as
// planning. Before the office-hours merge (DD-017) the ban was structural: a different skill
// owned phase authorship, so frame simply could not write one. Now one skill does both, and
// the only thing separating "wrote the roadmap the user approved" from "laundered a scope cut
// into a phase" is that approval. These pins hold the gate that structure used to hold.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

const frame = () => readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
const contract = () => readFileSync(join(skillsRoot, '_shared', 'references', 'ROADMAP-CONTRACT.md'), 'utf8')
const lifecycle = () => readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

test('scope narrowing is not legitimized by promoting scope to a ROADMAP phase', () => {
  const source = frame()
  const primeDirectives = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'prime-directives.md'), 'utf8')

  // The escape-hatch phrasings that let a narrowing skill record deferred scope as a roadmap
  // phase must stay gone. Roadmap is a steering surface, not a holding bin for a shrunk SPEC.
  assert.doesNotMatch(
    source,
    /record the narrowing as decomposition with deferred scope in[^\n]*ROADMAP/i,
    'auto-frame must not route a narrowed SPEC into ROADMAP.md'
  )
  assert.doesNotMatch(
    lifecycle(),
    /record the deferred scope in `\.agent\/steering\/ROADMAP\.md`/i,
    'ARTIFACT-LIFECYCLE must not route narrowing into ROADMAP.md'
  )
  assert.doesNotMatch(
    contract(),
    /Appends deferred scope as `status: pending` phases/,
    'ROADMAP-CONTRACT must not let a narrowed spec append pending phases'
  )

  // The safe alternatives, and the ban stated as a property of the narrowing rather than
  // of the skill: same skill, different path.
  assert.match(source, /widen it, ask for confirmation, or record the deferred scope/)
  assert.match(source, /A narrowed SPEC never becomes a `ROADMAP\.md` phase/)
  assert.match(source, /Silent narrowing is a framing failure/)
  assert.match(contract(), /A narrowed SPEC never becomes a roadmap phase/)
  assert.match(lifecycle(), /roadmap phases come only from a decomposition the user approved during framing/)

  // auto-eng-review is not a roadmap writer; deferred work it surfaces lives in the plan or review action.
  assert.doesNotMatch(
    primeDirectives,
    /approved plan, roadmap, or review action/,
    'auto-eng-review must not list roadmap as a deferred-work surface'
  )
})

// User approval is the whole gate now that one skill owns both paths. If the prose ever
// lets frame author a phase without it, scope cuts become roadmap items silently.
test('phase authorship is gated on explicit user approval, not on which skill runs', () => {
  const source = frame()

  assert.match(source, /Roadmap phases come only from a decomposition the user has approved/)
  assert.match(source, /Without that approval, leave `ROADMAP\.md` untouched/)
  assert.match(contract(), /Phases come only from a decomposition the user explicitly approved/)
  assert.match(contract(), /A user-approved decomposition replaces existing roadmap content/)
  assert.match(contract(), /Phases come only from a user-approved decomposition\. Nothing synthesizes them from repo evidence alone/)
})

// Without an adoption owner, every phase after the first stays pending with an empty
// change: field forever, and auto-verify's matching rule skips empty change: fields, so
// the roadmap decays into fiction after phase 1.
test('pending phases have an adoption owner so later phases can reach done', () => {
  const source = frame()

  assert.match(contract(), /\| `auto-frame` \| Adopts a pending phase/)
  assert.match(contract(), /adoption of a pending phase that matches a new approved objective/)
  assert.match(source, /Read `\.agent\/steering\/ROADMAP\.md` when it exists/)
  assert.match(source, /adopt it: set `status: active` and write the change slug into its `change:` field/)
})
