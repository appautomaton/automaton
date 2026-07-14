// auto-frame: scope preservation and adaptive SPEC shape.
// Failure story: silent narrowing is the frame-stage failure class. A SPEC quietly smaller
// than the user's stated goal ships the wrong change with full ceremony (ROADMAP-CONTRACT.md
// pins where deferred scope may live).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

test('auto-frame preserves scope and supports adaptive SPEC shapes', () => {
  const source = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
  const specShape = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'spec-shape.md'), 'utf8')

  assert.match(source, /produces the canonical artifact: `SPEC\.md` when the request is frameable/)
  assert.match(source, /SPEC\.md` is the reloadable contract/)
  assert.match(source, /spec\/\*\.md/)
  assert.match(source, /\.agent\/work\/<active_change>\/SPEC\.md/)
  assert.match(source, /The skeleton is preferred context, not a prerequisite for framing/)
  assert.match(source, /Do not send the user back to office-hours solely because no skeleton exists/)
  assert.match(source, /legacy `INTAKE\.md` from an earlier harness version is optional context/)
  assert.match(source, /Continue To Office-Hours When Not Frameable/)
  assert.match(source, /continue into `auto-office-hours`'s diagnostic flow/)
  assert.match(source, /Use this when the request needs discovery, not one blocking decision/)
  assert.match(source, /Silent narrowing is a framing failure/)
  assert.match(specShape, /Broader intent/)
  assert.match(specShape, /Work scale and work shape/)
  assert.match(source, /\*\*The office-hours skeleton is optional\.\*\*/)
  for (const token of ['structural change', 'behavioral invariants', 'gap matrix', 'audit questions', 'migration target', 'coverage target']) {
    assert.match(specShape, new RegExp(token, 'i'), `auto-frame spec shape must support adaptive spec token: ${token}`)
  }
})

test('auto-frame asks only blocking decisions, keeps one stage owner and a condition-only GATE', () => {
  const source = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')

  // Frame is the automation lane: discovery dialogue belongs to office-hours, and
  // frame's only question is a single blocking needs-decision item with options.
  assert.match(source, /Ask a question only when a single unresolved decision blocks the SPEC write/)
  assert.match(source, /Never ask what the repo can answer/)
  assert.doesNotMatch(source, /Ask at most three framing questions/)
  assert.doesNotMatch(source, /<INTERVIEW>/, 'the interview construct left with the discovery questions')

  // auto-plan owns the stage: plan mutation. Frame never records it, and the
  // lifecycle stage table agrees instead of carrying an approval escape hatch.
  assert.match(source, /auto-plan owns the `stage: plan` mutation/)
  assert.doesNotMatch(source, /Use `--stage plan` only when/)
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')
  // Both homes describe the mutation at its real moment: auto-plan's single sync call
  // lands stage and canonical_plan together when PLAN.md is written, not at plan entry.
  assert.match(lifecycle, /auto-plan records `stage: plan` when it writes PLAN\.md/)
  assert.match(source, /records it when it writes PLAN\.md/)
  assert.doesNotMatch(lifecycle, /when planning begins/)
  assert.doesNotMatch(lifecycle, /stays `frame` unless plan handoff is approved/)

  // The GATE holds conditions only. The write procedure lives outside the tag.
  const gate = source.match(/<GATE>([\s\S]*?)<\/GATE>/)?.[1] ?? ''
  assert.ok(gate.length > 0, 'auto-frame must keep its GATE')
  assert.doesNotMatch(gate, /Read `references\/spec-shape\.md`/)
  assert.doesNotMatch(gate, /Artifact Signal Discipline/)

  // Handoff stops use the pinned form.
  assert.match(source, /\*\*Next:\*\* auto-plan, <reason>/)
  assert.match(source, /The user reading SPEC\.md is the product review/)
  assert.doesNotMatch(source, /auto-ceo-review/)
})

test('auto-frame preserves review sections and never replaces them as producer', () => {
  const source = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
  const framework = readFileSync(join(skillsRoot, '_shared', 'references', 'FRAMEWORK.md'), 'utf8')

  assert.match(source, /preserve all `## Review:` sections/)
  assert.doesNotMatch(source, /replace prior `## Review:`/i)
  assert.match(framework, /the skill that owns a review section or gap block replaces its own prior block/)
  assert.match(framework, /producing skill that refreshes SPEC\.md or PLAN\.md preserves every existing `## Review:` section/)
})

// The Bet line and the four-scan self-review are the salvage from the removed
// auto-ceo-review: the artifact itself carries the product judgment surface,
// and the user approving it at frame's exit is the review.
test('auto-frame carries the bet line and the pre-approval self-review', () => {
  const specShape = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'spec-shape.md'), 'utf8')
  const quality = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'quality.md'), 'utf8')

  assert.match(specShape, /\*\*Bet:\*\*/, 'SPEC core fields must open with the Bet line')
  for (const scan of ['Placeholder scan', 'Contradiction scan', 'Bundling scan', 'Ambiguity scan']) {
    assert.match(quality, new RegExp(scan), `frame quality must keep the ${scan}`)
  }
  assert.match(quality, /two engineers could implement materially different changes/)
})

test('auto-frame checks request coverage before writing SPEC', () => {
  const source = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
  const specShape = readFileSync(join(skillsRoot, 'auto-frame', 'references', 'spec-shape.md'), 'utf8')

  assert.match(source, /### Coverage Check/)
  assert.match(source, /scope coverage/)
  assert.match(source, /target user or stakeholder/)
  assert.match(source, /Included items must appear/)
  assert.match(source, /Deferred items must stay deferred/)
  assert.match(source, /Anti-goals must appear/)
  assert.match(source, /Needs-decision items require one focused question with concrete options and your recommended answer/)
  assert.match(source, /Asking The User convention/)
  assert.match(source, /Do not drop a material item silently/)
  assert.match(specShape, /Target user or stakeholder/i)
  assert.match(specShape, /Scope coverage decisions/i)
})
