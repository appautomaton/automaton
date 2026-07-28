// auto-frame: scope preservation, adaptive SPEC shape, and adaptive conversational depth.
// Failure story: silent narrowing is the frame-stage failure class. A SPEC quietly smaller
// than the user's stated goal ships the wrong change with full ceremony (ROADMAP-CONTRACT.md
// pins where deferred scope may live). The second failure class arrived with the merge that
// folded auto-office-hours in (DD-017): one skill now owns both the dialogue and the artifact,
// so it can write files before the user approves an approach, or skip the diagnostic a vague
// request needed. The depth choice must stay explicit and the pre-approval write ban must hold.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

const frameRoot = join(skillsRoot, 'auto-frame')
const skill = () => readFileSync(join(frameRoot, 'SKILL.md'), 'utf8')
const reference = (name) => readFileSync(join(frameRoot, 'references', name), 'utf8')

test('auto-frame preserves scope and supports adaptive SPEC shapes', () => {
  const source = skill()
  const specShape = reference('spec-shape.md')

  assert.match(source, /produces the canonical artifact: `SPEC\.md`\. No file means no completed frame/)
  assert.match(source, /`SPEC\.md` is the reloadable contract/)
  assert.match(source, /spec\/\*\.md/)
  assert.match(source, /Silent narrowing is a framing failure/)
  assert.match(specShape, /Broader intent/)
  assert.match(specShape, /Work scale and work shape/)
  for (const token of ['structural change', 'behavioral invariants', 'gap matrix', 'audit questions', 'migration target', 'coverage target']) {
    assert.match(specShape, new RegExp(token, 'i'), `auto-frame spec shape must support adaptive spec token: ${token}`)
  }
})

// Depth is the merge's load-bearing decision. Splitting dialogue and artifact into two
// skills forced the user to route before anyone had read the request; 11 of 12 changes
// took the artifact door and skipped a diagnostic they were never offered. One skill only
// helps if it actually chooses, and says which way it chose.
test('auto-frame chooses conversational depth after reading, and says which it chose', () => {
  const source = skill()

  assert.match(source, /Depth is chosen after reading, never before/)
  assert.match(source, /### Choose Depth/)
  assert.match(source, /pick the path and say which you took in one line/)
  assert.match(source, /Do not run a diagnostic to look thorough, and do not skip one to look fast/)
  assert.match(source, /Roadmap-sized work always earns it/)
  // The old split is gone: no skill to bounce to, and no skeleton handoff between them.
  assert.doesNotMatch(source, /auto-office-hours/)
  assert.doesNotMatch(source, /skeleton/i)
  assert.equal(existsSync(join(skillsRoot, 'auto-office-hours')), false)
  assert.equal(existsSync(join(frameRoot, 'references', 'spec-skeleton.md')), false)
})

test('auto-frame separates work scale from work shape', () => {
  const source = skill()

  assert.match(source, /Work scale/i)
  assert.match(source, /Work shape/i)
  for (const shape of ['feature', 'refactor', 'parity', 'audit', 'migration', 'coverage', 'content', 'mixed']) {
    assert.match(source, new RegExp(shape, 'i'), `auto-frame must mention work shape: ${shape}`)
  }
  assert.match(source, /Large is not roadmap/)
  assert.match(source, /Capability-sized work stays one spec/)
  assert.match(reference('spec-shape.md'), /Scope preservation/i)
})

test('auto-frame covers the request before narrowing scope', () => {
  const source = skill()
  const specShape = reference('spec-shape.md')

  assert.match(source, /### Cover The Request/)
  assert.match(source, /perspectives or audiences/)
  assert.match(source, /explicit asks/)
  assert.match(source, /implied asks/)
  for (const bucket of ['included', 'deferred', 'anti-goal', 'needs decision']) {
    assert.match(source, new RegExp(bucket, 'i'), `auto-frame must classify coverage bucket: ${bucket}`)
  }
  assert.match(source, /one focused question with concrete options and your recommended answer/)
  assert.match(source, /Asking The User convention/)
  assert.match(source, /Do not drop a material item silently/)
  assert.match(source, /decision map, not a transcript/)

  assert.match(specShape, /records decisions, not the conversation that produced them/)
  assert.match(specShape, /Scope coverage/i)
  assert.match(specShape, /Target user or stakeholder/i)
  assert.match(specShape, /Mode context/i)
  for (const mode of ['Startup', 'Builder', 'Content']) {
    assert.match(specShape, new RegExp(mode), `spec shape must carry ${mode} mode context`)
  }
  assert.match(specShape, /Omit empty groups/)
  assert.match(specShape, /Do not carry the full alternatives analysis/)
})

// Grill mode is the salvage of the grill-me interaction contract: the model extracts
// judgment from the human instead of pronouncing product verdicts. It must stay opt-in,
// or framing turns every session into an interrogation.
test('auto-frame carries the question contract and an opt-in grill mode', () => {
  const source = skill()
  const diagnostic = reference('diagnostic.md')
  const calibration = reference('diagnostic-calibration.md')
  const framework = readFileSync(join(skillsRoot, '_shared', 'references', 'FRAMEWORK.md'), 'utf8')

  // The question convention has one home (FRAMEWORK.md, Asking The User); the skill
  // points at it instead of restating it with drifting counts.
  assert.match(framework, /## Asking The User/)
  assert.match(framework, /Ask one question per message, with your recommended answer/)
  assert.match(framework, /2 to 4 concrete options/)
  assert.doesNotMatch(source, /2–4 concrete options|2–3 concrete options/)
  assert.match(source, /Never ask what the repo can answer/)
  assert.match(diagnostic, /Asking The User convention/)
  assert.match(diagnostic, /resolving dependent decisions one at a time/)
  assert.match(diagnostic, /high-stakes \(auth, schema, concurrency, migration, payments\)/)
  assert.match(diagnostic, /Never self-escalate into a grill/)
  assert.match(calibration, /## Grill Depth/)
  assert.match(calibration, /Walk the decision tree in dependency order/)
  assert.match(calibration, /Stress-test relationships with concrete scenarios/)
})

test('auto-frame writes nothing while a scope-changing decision is unresolved', () => {
  const source = skill()
  const gate = source.match(/<GATE>([\s\S]*?)<\/GATE>/)?.[1] ?? ''

  assert.ok(gate.length > 0, 'auto-frame must keep its GATE')
  assert.match(gate, /Do NOT write `SPEC\.md` while a decision that would change scope, approach, or verification is unresolved/)
  assert.match(gate, /presenting options and then writing your own recommendation is not approval/)
  assert.match(gate, /Do NOT finish framing without `SPEC\.md`/)
  // The GATE holds conditions only. The write procedure lives outside the tag.
  assert.doesNotMatch(gate, /Read `references\/spec-shape\.md`/)
  assert.doesNotMatch(gate, /Artifact Signal Discipline/)
  // One GATE per skill keeps the tag a pattern break (XML-CONVENTIONS.md, Signal Scarcity).
  assert.equal(source.match(/<GATE>/g)?.length, 1)
})

test('auto-frame names the change before the write that consumes the slug', () => {
  // Failure story: the slug was derived two steps after the SPEC write that needs it,
  // and the ROADMAP adoption needed it earlier still. A step that says "use that slug
  // before writing SPEC.md" must not sit behind the write.
  const source = skill()

  assert.match(source, /### Name The Change/)
  assert.ok(
    source.indexOf('derive a new slug') < source.indexOf('### Write SPEC.md'),
    'slug derivation must come before the SPEC.md write'
  )
  assert.ok(
    source.indexOf('### Name The Change') < source.indexOf('### Cover The Request'),
    'the ROADMAP adoption in Cover The Request consumes the slug'
  )
})

test('auto-frame keeps one stage owner and the pinned handoff form', () => {
  const source = skill()
  const lifecycle = readFileSync(join(skillsRoot, '_shared', 'references', 'ARTIFACT-LIFECYCLE.md'), 'utf8')

  assert.match(source, /auto-plan owns the `stage: plan` mutation/)
  assert.doesNotMatch(source, /Use `--stage plan` only when/)
  // Both homes describe the mutation at its real moment: auto-plan's single sync call
  // lands stage and canonical_plan together when PLAN.md is written, not at plan entry.
  assert.match(lifecycle, /auto-plan records `stage: plan` when it writes PLAN\.md/)
  assert.match(source, /records it when it writes PLAN\.md/)
  assert.doesNotMatch(lifecycle, /when planning begins/)
  assert.doesNotMatch(lifecycle, /stays `frame` unless plan handoff is approved/)

  assert.match(source, /\*\*Next:\*\* auto-plan, <reason>/)
  assert.match(source, /Frame's exit is a mandatory stop/)
  // The edge's why has one home (ARTIFACT-LIFECYCLE.md, Handoff Contract); the skill
  // performs the stop and points. The why itself stays pinned at its home by
  // artifact-lifecycle.test.mjs.
  assert.doesNotMatch(source, /The user reading SPEC\.md is the product review/)
  assert.doesNotMatch(source, /auto-ceo-review/)
})

test('auto-frame preserves review sections and never replaces them as producer', () => {
  const source = skill()
  const framework = readFileSync(join(skillsRoot, '_shared', 'references', 'FRAMEWORK.md'), 'utf8')

  assert.match(source, /preserve every `## Review:` section/)
  assert.doesNotMatch(source, /replace prior `## Review:`/i)
  assert.match(framework, /the skill that owns a review section or gap block replaces its own prior block/)
  assert.match(framework, /producing skill that refreshes SPEC\.md or PLAN\.md preserves every existing `## Review:` section/)
})

// The Bet line and the four-scan self-review are the salvage from the removed
// auto-ceo-review: the artifact itself carries the product judgment surface,
// and the user approving it at frame's exit is the review. The conversation test
// arrived with the merge: one card now guards two output moments.
test('auto-frame carries the bet line and both quality tests', () => {
  const specShape = reference('spec-shape.md')
  const quality = reference('quality.md')

  assert.match(specShape, /\*\*Bet:\*\*/, 'SPEC core fields must open with the Bet line')
  for (const scan of ['Placeholder scan', 'Contradiction scan', 'Bundling scan', 'Ambiguity scan']) {
    assert.match(quality, new RegExp(scan), `frame quality must keep the ${scan}`)
  }
  assert.match(quality, /two engineers could implement materially different changes/)
  assert.match(quality, /would not change the user's next decision/)
  assert.match(quality, /Sycophantic validation/)
  assert.match(quality, /Solution leakage/)
})

test('auto-frame uses observable diagnostic checks instead of posture language', () => {
  const source = skill()
  const diagnostic = reference('diagnostic.md')
  const calibration = reference('diagnostic-calibration.md')

  assert.match(diagnostic, /names concrete evidence, a specific stakeholder, or an observable workaround/)
  assert.match(diagnostic, /evaluate the evidence directly/i)
  assert.doesNotMatch(source + diagnostic, /uncomfortable|Comfort means|Challenge directly|take a position/i)

  assert.match(calibration, /evidence-backed assessment/)
  assert.match(calibration, /Soft To Sharp/)
  assert.doesNotMatch(calibration, /take a position|point of discomfort/)
  for (const retired of ['anti-sycophancy.md', 'pushback-patterns.md', 'question-exemplars.md']) {
    assert.equal(existsSync(join(frameRoot, 'references', retired)), false)
  }
})

test('auto-frame ships startup and builder diagnostic references', () => {
  const diagnostic = reference('diagnostic.md')
  const startup = reference('startup-diagnostic.md')
  const builder = reference('builder-diagnostic.md')

  assert.match(skill(), /references\/diagnostic\.md/)
  assert.match(diagnostic, /`startup-diagnostic\.md`/)
  assert.match(diagnostic, /`builder-diagnostic\.md`/)
  assert.match(startup, /Demand Reality/)
  assert.match(startup, /Smart Routing by Product Stage/)
  assert.match(startup, /Smart Routing by Work Scale/)
  assert.match(builder, /coolest version/)
  assert.match(builder, /Smart Routing by Work Scale/)
})

// Landscape search must be reachable from every mode: its file carries Builder search
// guidance and the consent gate that governs outbound queries. A Startup-scoped trigger
// meant Builder sessions searched (or skipped searching) without ever loading either.
test('landscape awareness is reachable from every mode with its consent gate', () => {
  const landscape = reference('landscape-awareness.md')

  assert.match(reference('diagnostic.md'), /Any mode: `landscape-awareness\.md`/)
  assert.match(landscape, /## Privacy Gate/)
  assert.match(landscape, /\*\*Builder mode:\*\* Search for/)
})

test('auto-frame references route only to steps that exist in the skill', () => {
  const source = skill()
  const landscape = reference('landscape-awareness.md')
  const contentIntake = reference('content-intake.md')
  const alternatives = reference('alternatives-format.md')

  // Every step a reference routes into must be a real heading in the merged skill.
  for (const step of [...landscape.matchAll(/`?### ([A-Z][A-Za-z ]+)`?/g)].map((match) => match[1])) {
    assert.match(source, new RegExp(`### ${step}`), `landscape-awareness routes to a step that must exist: ${step}`)
  }

  // Content is a peer mode alongside Startup and Builder, not an overlay on them.
  assert.match(contentIntake, /Content is a peer mode alongside Startup and Builder/)
  assert.doesNotMatch(contentIntake, /mode detection \(Startup or Builder\)/)

  // The minimal-viable and ideal-architecture mandate is scoped to the shapes SKILL.md
  // names, so shape-specific differentiation is not overridden by the format reference.
  assert.match(alternatives, /For bug, feature, and capability work, one must be minimal viable/)
  assert.match(alternatives, /blast radius, traceability, evidence depth, rollout risk, or verification strength/)
})

test('shape questions have one home both diagnostics point at', () => {
  // One home per contract: the per-shape question sets lived near-verbatim in
  // both mode diagnostics and could silently diverge. shape-questions.md is
  // the single home; the diagnostics carry only the pointer.
  const home = reference('shape-questions.md')

  for (const shape of ['Parity', 'Audit', 'Refactor', 'Migration', 'Coverage']) {
    assert.match(home, new RegExp(`\\*\\*${shape}:`), `${shape} questions must live in the home`)
  }
  for (const diagnostic of [reference('startup-diagnostic.md'), reference('builder-diagnostic.md')]) {
    assert.match(diagnostic, /references\/shape-questions\.md/)
    assert.doesNotMatch(diagnostic, /What is the reference system/, 'shape questions must not be restated in a diagnostic')
  }
})
