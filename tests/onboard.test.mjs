// auto-onboard: progressive-disclosure support docs and templates.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

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
