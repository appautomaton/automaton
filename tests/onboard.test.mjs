// auto-onboard: progressive-disclosure support docs and templates.
// Failure story: onboarding that parks open questions, confidence labels, or speculative
// roadmap phases in steering turns durable project truth into a scratchpad other skills
// then trust (ROADMAP-CONTRACT.md invariants).
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

test('auto-onboard gates, confidence markers, and cross-references agree with its own paths', () => {
  const onboardRoot = join(skillsRoot, 'auto-onboard')
  const skill = readFileSync(join(onboardRoot, 'SKILL.md'), 'utf8')
  const artifactContract = readFileSync(join(onboardRoot, 'references', 'artifact-contract.md'), 'utf8')
  const topologyScan = readFileSync(join(onboardRoot, 'references', 'topology-scan.md'), 'utf8')

  // The overwrite-confirmation GATE must not block the scaffold path Detect State authorizes.
  assert.match(skill, /Real \(non-scaffold\) steering exists and the user has not confirmed/)
  assert.match(skill, /Scaffold-level steering proceeds without confirmation/)

  // The rule bans verdict-style confidence sections, not the mandated certainty markers.
  assert.match(skill, /The Observed, Inferred, and Needs Confirmation split from the artifact contract is required, not banned/)
  assert.match(artifactContract, /are the required certainty split, not chatter/)
  assert.doesNotMatch(skill + artifactContract, /free of speculative questions, confidence labels/)

  // The cross-skill review-section contract lives in FRAMEWORK.md, not in a reference
  // no review skill ever loads, and "append-only" contradicted append-replace.
  assert.doesNotMatch(artifactContract, /Work Artifact Integrity/)
  assert.doesNotMatch(artifactContract, /append-only/)

  // question-patterns.md lives under references/, not a nonexistent examples/ directory.
  assert.match(topologyScan, /references\/question-patterns\.md/)
  assert.doesNotMatch(topologyScan, /examples\/question-patterns\.md/)
})

test('auto-onboard ships progressive-disclosure support docs and templates', () => {
  const onboardRoot = join(skillsRoot, 'auto-onboard')
  const expectedFiles = [
    'references/topology-scan.md',
    'references/artifact-contract.md',
    'references/question-patterns.md',
    'templates/REPO-MAP.md',
    'templates/PROJECT.md',
    'templates/REQUIREMENTS.md',
    'templates/ROADMAP.md'
  ]

  for (const relativePath of expectedFiles) {
    assert.equal(existsSync(join(onboardRoot, relativePath)), true)
  }

  const artifactContract = readFileSync(join(onboardRoot, 'references', 'artifact-contract.md'), 'utf8')
  const projectTemplate = readFileSync(join(onboardRoot, 'templates', 'PROJECT.md'), 'utf8')
  const repoMapTemplate = readFileSync(join(onboardRoot, 'templates', 'REPO-MAP.md'), 'utf8')
  const requirementsTemplate = readFileSync(join(onboardRoot, 'templates', 'REQUIREMENTS.md'), 'utf8')
  const skill = readFileSync(join(onboardRoot, 'SKILL.md'), 'utf8')
  const quality = readFileSync(join(onboardRoot, 'references', 'quality.md'), 'utf8')
  const questionPatterns = readFileSync(join(onboardRoot, 'references', 'question-patterns.md'), 'utf8')
  const roadmapTemplate = readFileSync(join(onboardRoot, 'templates', 'ROADMAP.md'), 'utf8')
  const sharedRoadmapContract = readFileSync(join(skillsRoot, '_shared', 'references', 'ROADMAP-CONTRACT.md'), 'utf8')

  assert.match(artifactContract, /Do not duplicate canonical artifact paths/)
  assert.match(artifactContract, /`current\.json`, SPEC\.md, and PLAN\.md own active work pointers/)
  assert.match(artifactContract, /Do not use durable artifacts as scratchpads/)
  assert.match(artifactContract, /do not include `Open Questions`, `Import Verdict`/)
  assert.match(artifactContract, /do not carry generic unknowns/)
  assert.match(artifactContract, /never write phases during first-time onboarding/)
  assert.match(projectTemplate, /compact identity record/)
  assert.doesNotMatch(projectTemplate, /## Current System Model/)
  assert.match(requirementsTemplate, /durable constraints only/)
  assert.doesNotMatch(requirementsTemplate, /### Observed/)
  assert.doesNotMatch(requirementsTemplate, /## Open Risks and Unknowns/)
  assert.match(repoMapTemplate, /## Blocking Ambiguities/)
  assert.doesNotMatch(repoMapTemplate, /## Open Questions/)
  assert.doesNotMatch(repoMapTemplate, /## Import Verdict/)
  assert.doesNotMatch(repoMapTemplate, /recommended next skill/)
  assert.match(skill, /Do not create roadmap phases on a first run/)
  assert.match(skill, /Treat artifact writing as expensive/)
  assert.match(skill, /no open-question parking, confidence verdict, or recommended next skill/)
  assert.match(quality, /Question parking/)
  assert.match(quality, /Routing chatter/)
  assert.match(quality, /Template gravity/)
  assert.match(skill, /user confirms importing or refreshing it in chat/)
  assert.match(questionPatterns, /do not ask during first-time onboarding/)
  assert.match(questionPatterns, /Candidate future work is not enough/)
  assert.match(sharedRoadmapContract, /must not create roadmap phases during first-time onboarding/)
  assert.match(sharedRoadmapContract, /must not synthesize roadmap phases from repo evidence alone during refresh/)
  assert.match(roadmapTemplate, /No active roadmap/)
  assert.match(roadmapTemplate, /First-time onboarding does not create roadmap phases/)
  assert.match(roadmapTemplate, /user confirmation in chat/)
  assert.doesNotMatch(roadmapTemplate, /repo-evident independent outcomes/)
  assert.doesNotMatch(roadmapTemplate, /Phase 1: \.\.\./)
  assert.doesNotMatch(roadmapTemplate, /Keep this to 3 to 6 phases/)
})
