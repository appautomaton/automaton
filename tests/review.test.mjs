// auto-ceo-review / auto-eng-review: optional review contracts.
// Failure story: review output that restates the spec or emits full matrices drowns the one
// signal a review exists to produce, the verdict and its strongest risk.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot, authoredSkills } from './support/skill-helpers.mjs'

test('review and verification templates avoid nobody-reads-this bulk', () => {
  const officeHours = readFileSync(join(skillsRoot, 'auto-office-hours', 'SKILL.md'), 'utf8')
  const verify = readFileSync(join(skillsRoot, 'auto-verify', 'SKILL.md'), 'utf8')
  const verificationTemplate = readFileSync(join(skillsRoot, 'auto-verify', 'references', 'verification-template.md'), 'utf8')
  const engReview = readFileSync(join(skillsRoot, 'auto-eng-review', 'SKILL.md'), 'utf8')
  const engineeringSections = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'engineering-sections.md'), 'utf8')
  const primeDirectives = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'prime-directives.md'), 'utf8')
  const alternatives = readFileSync(join(skillsRoot, 'auto-eng-review', 'references', 'implementation-alternatives.md'), 'utf8')

  assert.match(officeHours, /INTAKE\.md is a decision record, not a transcript/)
  assert.match(verify, /Build the full criterion checklist internally/)
  assert.match(verify, /Do not print a long pass transcript/)
  assert.match(verificationTemplate, /The full checklist is internal/)
  assert.match(verificationTemplate, /report passing criteria as grouped counts/)
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

  for (const reviewSkill of ['auto-ceo-review', 'auto-eng-review']) {
    assert.equal(
      existsSync(join(skillsRoot, reviewSkill, 'references', 'review-template.md')),
      true,
      `${reviewSkill} must keep review-template.md under references/`
    )
    const skill = readFileSync(join(skillsRoot, reviewSkill, 'SKILL.md'), 'utf8')
    assert.match(skill, /references\/review-template\.md/, `${reviewSkill} must load references/review-template.md`)
    assert.doesNotMatch(skill, /examples\/review-template\.md/, `${reviewSkill} must not reference the deleted examples copy`)
  }
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
  assert.match(voice, /not permission to act: the user decides/, 'cross-model agreement must not become an auto-apply')
  assert.match(voice, /Never edit the verdict, the plan, or the review section/, 'outside-voice findings need a user decision to land')
  assert.match(voice, /continue without it and say so in one line/, 'a missing second model must degrade gracefully')
})
