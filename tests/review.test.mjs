// auto-eng-review: the optional review contract.
// Failure story: review output that restates the spec or emits full matrices drowns the one
// signal a review exists to produce, the verdict and its strongest risk.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot, authoredSkills } from './support/skill-helpers.mjs'

test('review and verification templates avoid nobody-reads-this bulk', () => {
  const frame = readFileSync(join(skillsRoot, 'auto-frame', 'SKILL.md'), 'utf8')
  const verify = readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')
  const verificationTemplate = readFileSync(join(skillsRoot, 'auto-verify', 'references', 'verification-template.md'), 'utf8')
  const engReview = readFileSync(join(skillsRoot, 'auto-eng-review', 'SKILL.md'), 'utf8')
  const engineeringSections = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'engineering-sections.md'), 'utf8')
  const primeDirectives = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'prime-directives.md'), 'utf8')
  const alternatives = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'implementation-alternatives.md'), 'utf8')

  assert.match(frame, /decision record, not a transcript/)
  assert.match(verify, /Build the full criterion checklist internally/)
  assert.match(verify, /Summarize passing criteria by slice/)
  assert.match(verificationTemplate, /The full checklist is internal/)
  assert.match(verificationTemplate, /Report passing criteria as grouped counts/)
  assert.match(engReview, /Use this matrix as an internal checklist/)
  assert.match(engReview, /Do not emit the full risk matrix/)
  assert.match(engReview, /only when the plan carries non-trivial engineering risk/)
  assert.match(engineeringSections, /trigger-based risk checklist/)
  assert.match(engineeringSections, /do not write "No issues found" filler/)
  assert.doesNotMatch(engineeringSections, /Never skip a section/)
  assert.doesNotMatch(primeDirectives, /Diagrams are mandatory/)
  assert.match(primeDirectives, /Diagrams earn their space/)
  assert.match(alternatives, /Use this only when PLAN\.md lacks an approach rationale/)
  assert.doesNotMatch(alternatives, /This is not optional/)
})

test('skills keep review-template.md in references only, with no dead examples dir', () => {
  // The examples/review-template.md copies were unreferenced duplicates of references/review-template.md;
  // both review skills load the references/ copy. Guard against the dead-file class returning.
  for (const skillName of authoredSkills) {
    assert.equal(
      existsSync(join(skillsRoot, skillName, 'examples')),
      false,
      `${skillName} must not ship an examples/ directory (use references/ as the single source)`
    )
  }

  for (const reviewSkill of ['auto-eng-review']) {
    assert.equal(
      existsSync(join(skillsRoot, reviewSkill, 'references', 'review-template.md')),
      true,
      `${reviewSkill} must keep review-template.md under references/`
    )
    const skill = readFileSync(join(skillsRoot, reviewSkill, 'SKILL.md'), 'utf8')
    assert.match(skill, /references\/review-template\.md/, `${reviewSkill} must load references/review-template.md`)
    assert.doesNotMatch(skill, /examples\/review-template\.md/, `${reviewSkill} must not reference the deleted examples copy`)
  }

  assert.equal(
    existsSync(join(skillsRoot, 'auto-ceo-review')),
    false,
    'auto-ceo-review must stay removed: the user approving SPEC.md at frame exit is the product review'
  )
})

test('review and verification templates use the pinned handoff form and risk capacity', () => {
  const engTemplate = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'review-template.md'), 'utf8')
  const verificationTemplate = readFileSync(join(skillsRoot, 'auto-verify', 'references', 'verification-template.md'), 'utf8')

  // FAIL closes with the pinned **Next:** form, not a freehand recommendation line.
  assert.match(verificationTemplate, /\*\*Next:\*\* auto-execute, \[reason\]/)
  assert.match(verificationTemplate, /`\*\*Next:\*\* auto-plan, \[repeated criterion\]`/)
  assert.doesNotMatch(verificationTemplate, /Recommended next skill/)

  // approved_with_risks can document one line per slice-scoped risk inside the template.
  assert.match(engTemplate, /for `approved_with_risks`: one line per documented risk/)
  assert.match(engTemplate, /naming the slice it affects when known/)

  // The outside-voice loop records into the template's one conditional field,
  // so the two references cannot contradict each other on where results land.
  assert.match(engTemplate, /Outside voice: /)
  assert.match(engTemplate, /present only when the cross-model loop ran/)
})

test('auto-eng-review treats DESIGN.md as optional canonical context', () => {
  const source = readFileSync(join(skillsRoot, 'auto-eng-review', 'SKILL.md'), 'utf8')

  assert.match(source, /canonical_design/)
  assert.match(source, /DESIGN\.md` only when `canonical_design` is set and resolves to a file/)
  assert.match(source, /Missing DESIGN\.md is not a blocker/)
})

test('the outside voice is optional, bounded, and never auto-applies (DD-013)', () => {
  const engReview = readFileSync(join(skillsRoot, 'auto-eng-review', 'SKILL.md'), 'utf8')
  const voice = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'outside-voice.md'), 'utf8')

  assert.match(engReview, /references\/outside-voice\.md/, 'eng-review must trigger the outside voice behind a conditional read')
  assert.match(voice, /## Consent/, 'plan content leaves the provider only after an explicit yes')
  assert.match(voice, /not permission to act: the user decides/, 'cross-model agreement must not become an auto-apply')
  assert.match(voice, /Never edit the verdict, the plan, or the review section verdict fields/, 'outside-voice findings need a user decision to land')
  assert.match(voice, /continue without it and say so in one line/, 'a missing second model must degrade gracefully')

  // The grill-me Act 2 mechanics, kept host-agnostic: bounded rounds, reviewer
  // memory, arbitered findings, honest deadlock. CLI mechanics belong to hosts.
  assert.match(voice, /Rounds are capped at 3 by default/)
  assert.match(voice, /always terminates at the cap/)
  assert.match(voice, /Where the host supports resuming the same model session/)
  assert.match(voice, /reject it with a one-line logged reason/)
  assert.match(voice, /Never fake convergence/)
  assert.match(voice, /Record the round count and any unresolved points/)
  assert.match(voice, /orchestration\/outside-voice-log\.md/, 'the argument transcript must persist as an audit artifact')
  assert.match(voice, /read-only or sandbox mode on every invocation, including resumes/, 'a CLI critic must be forced read-only on every call')
  assert.doesNotMatch(voice, /codex exec|--json|thread_id/i, 'host CLI mechanics must not enter the reference')
})
