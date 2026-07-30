import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot, authoredSkills } from './support/skill-helpers.mjs'

// Context census: per-stage prompt weight is a regression-guarded number, not a vibe.
// Ceilings are words (roughly 1.3 tokens per word) with ~10% headroom over the current
// size. A failure here is not a bug; it is a deliberate decision point: either trim the
// file back under the ceiling or consciously raise the ceiling in this test and say why
// in the commit. Ceilings only ratchet up for new capability, never for restated prose.

const words = (relativePath) =>
  readFileSync(join(skillsRoot, relativePath), 'utf8').split(/\s+/).filter(Boolean).length

// 2026-07-14 lightweight-steering ratchet: ceilings lowered to actuals plus ~5%
// after the coherence and zero-based trim rounds, so removed handholding cannot
// silently regrow. Down-ratchets lock trims; only new capability raises a ceiling.
const SHARED_CEILINGS = {
  // Carries the Asking The User consolidation (one home for the question
  // convention that three skills used to restate with drifting option counts)
  // and the change-parking rule (one home for the guard the two frame-stage
  // entry points previously restated or missed).
  // Raised 870 -> 890: the Handoff Model gained a Where rule pinning that a stop
  // is issued from a ### Hand Off step inside ## Do, never from ## Output. That is
  // new capability, not restated prose. Before it, six skills described the handoff
  // among their outputs and issued it from nowhere, so a model that read ## Output
  // as documentation, which it is, ended the turn silently. Paying ~20 words here
  // let the eight SKILL.md files drop 100.
  // Raised 890 -> 945 (pass 8, actual 900): the Where rule bent to legitimize the
  // two real emission shapes (verify's outcome fan-out, execute's loop-back), new
  // structural capability; the four-edge enumeration moved home to ARTIFACT-LIFECYCLE.
  // Down-ratchet 945 -> 922 (pass 9): Loading Discipline collapsed to two pointer
  // lines; actual 878, 878 x 1.05 = 922.
  '_shared/references/FRAMEWORK.md': 922,
  // Down-ratchet 1940 -> 1817 (passes 8-9): skill restatements and phase authorship
  // became pointers; actual 1730, 1730 x 1.05 = 1817.
  '_shared/references/ARTIFACT-LIFECYCLE.md': 1817,
  // Down-ratchet 585 -> 464 (DD-021): the four numbered principles explaining what a
  // context window is, and the staged bad-phrasing table, left. The artifact boundary
  // they surrounded stayed. Actual 442, 442 x 1.05 = 464.
  '_shared/references/CONTEXT-BUDGET.md': 464,
  // Raised 1100 -> 1350 for DD-013: evidence-over-signal completion, BLOCKED
  // triage, and parallel worktree isolation are new coordination capability,
  // not restated prose.
  '_shared/references/SUBAGENT-PROTOCOL.md': 1350,
  '_shared/references/LIBRARIAN.md': 380,
  // Down-ratchet 270 -> 213 (DD-022). DD-021 held this at 270 on the reasoning that
  // describing a structure costs more than listing the adjectives it produces, which was
  // the right comparison against a word list and the wrong one against a bare name. Seven
  // of the eleven glosses restated a pattern any capable model already holds, so they
  // diluted the four that carry a real test (delete-the-third-item, would-it-sit-unchanged,
  // the copula substitution, the invented-ratio extension). Names are the retrieval key;
  // a line earns its place only by settling a marginal case the name leaves open.
  // Actual 203, 203 x 1.05 = 213.
  '_shared/references/ANTI-SLOP.md': 213,
  // Down-ratchet 670 -> 585 (pass 9): the zero-consumer evidence field and the
  // empty-shape doctrine line removed; actual 557, 557 x 1.05 = 585.
  '_shared/references/ROADMAP-CONTRACT.md': 585
}

const SKILL_CEILINGS = {
  // Down-ratchet 1890 -> 1855 (pass 3 halt/proceed contract): actual 1767 after
  // internal-repeat trims; the approved_with_risks fix added capability back.
  // 1767 x 1.05 = 1855.
  'auto-execute/SKILL.md': 1855,
  'auto-plan/SKILL.md': 1250,
  // DD-017 folded auto-office-hours into auto-frame: two ceilings totalling 2800 become
  // one at 1400. The merged entry point is 1375, up 269 from frame alone, which buys mode
  // classification, the depth choice, and roadmap authorship. The diagnostic machinery it
  // absorbed rides references/diagnostic.md behind the Choose Depth trigger instead of the
  // common path, because 11 of the last 12 changes never ran a diagnostic.
  // Pass 6's slug reorder holds 1400 at actual 1387 (1% headroom): the duplicate
  // write-ban deletion paid for the Name The Change step.
  'auto-frame/SKILL.md': 1400,
  // Down-ratchet 1000 -> 917 (pass 12): the gate boundary and template flip added
  // precision, not bulk; actual 873, 873 x 1.05 = 917.
  'auto-verify/SKILL.md': 917,
  // Down-ratchet 750 -> 686 (DD-022 pass 2): the risk matrix dropped its "What a 10 looks
  // like" column. Those anchors described the top of a 0-10 scale while the only operational
  // rule keys off the bottom, so they calibrated nothing the decision needed. The six
  // dimensions and the blocking rule stay. Actual 653, 653 x 1.05 = 686.
  'auto-eng-review/SKILL.md': 686,
  // Raised 700 -> 750 for DD-012/DD-013: the execution-ledger reconciliation
  // (slice commits, in-flight dirt, stray worktrees) is new recovery capability.
  // Down-ratchet 740 -> 696 (pass 2 recovery contract): actual 663 after the
  // librarian-dispatch and unreachable-scenario trims, 663 x 1.05 = 696.
  'auto-resume/SKILL.md': 696
}

test('shared references stay under their word ceilings', () => {
  for (const [file, ceiling] of Object.entries(SHARED_CEILINGS)) {
    const actual = words(file)
    assert.ok(actual <= ceiling, `${file} is ${actual} words, ceiling ${ceiling}: trim it or consciously raise the ceiling`)
  }
})

test('skill entry points stay under their word ceilings', () => {
  for (const [file, ceiling] of Object.entries(SKILL_CEILINGS)) {
    const actual = words(file)
    assert.ok(actual <= ceiling, `${file} is ${actual} words, ceiling ${ceiling}: trim it or consciously raise the ceiling`)
  }
})

// Stage working sets: FRAMEWORK (read once per session) plus the SKILL.md plus the shared
// references the skill's own prose pulls on its common path. Conditional pulls (quality
// cards, content tracks, recovery tables) are excluded: they load only when triggered.
const WORKING_SETS = {
  'frame common path': {
    // Raised 2070 -> 2300 by DD-017. The set is 2251: one skill now covers a path that
    // used to cost 2377 for office-hours plus 1982 for frame when a change needed both.
    // The shallow path pays +181 over frame alone for the depth choice and the mode read.
    // Pass 14: holds at actual 2268 (1.4% headroom); frame's ceiling is the constraint.
    files: ['_shared/references/FRAMEWORK.md', 'auto-frame/SKILL.md'],
    ceiling: 2300
  },
  'plan': {
    // Down-ratchet 4030 -> 4000 (pass 14): actual 3808, 3808 x 1.05 = 3998.
    files: ['_shared/references/FRAMEWORK.md', 'auto-plan/SKILL.md', '_shared/references/ARTIFACT-LIFECYCLE.md'],
    ceiling: 4000
  },
  'execute direct route': {
    // Down-ratchet 5181 -> 5087 (DD-021): CONTEXT-BUDGET shed the common-knowledge
    // principles. Actual 4845, 4845 x 1.05 = 5087.
    files: [
      '_shared/references/FRAMEWORK.md',
      'auto-execute/SKILL.md',
      '_shared/references/ARTIFACT-LIFECYCLE.md',
      '_shared/references/CONTEXT-BUDGET.md'
    ],
    ceiling: 5087
  },
  'execute subagent route': {
    // Down-ratchet 6547 -> 6453 (DD-021): same CONTEXT-BUDGET trim carried through.
    // Actual 6146, 6146 x 1.05 = 6453.
    files: [
      '_shared/references/FRAMEWORK.md',
      'auto-execute/SKILL.md',
      '_shared/references/ARTIFACT-LIFECYCLE.md',
      '_shared/references/CONTEXT-BUDGET.md',
      '_shared/references/SUBAGENT-PROTOCOL.md'
    ],
    ceiling: 6453
  },
  'verify': {
    // Down-ratchet 3800 -> 3655 (pass 14): actual 3481, 3481 x 1.05 = 3655.
    files: ['_shared/references/FRAMEWORK.md', 'auto-verify/SKILL.md', '_shared/references/ARTIFACT-LIFECYCLE.md'],
    ceiling: 3655
  }
}

test('stage working sets stay under their word ceilings', () => {
  for (const [stage, { files, ceiling }] of Object.entries(WORKING_SETS)) {
    const actual = files.reduce((sum, file) => sum + words(file), 0)
    assert.ok(actual <= ceiling, `${stage} working set is ${actual} words, ceiling ${ceiling}: trim a member or consciously raise the ceiling`)
  }
})

// Layer 2 census (DD-022). The ceilings above cover entry points and shared references:
// 53% of the shipped corpus. The other 47% is per-skill references and role sources, which
// had no ceiling of any kind. That is where the dated content survived two trim rounds:
// auto-frame carried 2,564 words of founder-coaching diagnostics behind a trigger DD-017
// measured firing in 1 of 12 changes, and nothing measured it because working sets exclude
// conditional pulls by design. Excluding them from the common-path number is correct.
// Excluding them from measurement entirely is what let them grow.
//
// Two tiers, mirroring the structure above. A per-file default with named escapes (the
// LEXICON posture: a default with a named escape beats a bare cap), and a per-skill total
// that catches accumulation the per-file cap cannot see, since ten small files pass it
// individually. The walk is directory-driven, so a new reference is covered the moment it
// lands: a file nobody listed still has to justify its weight.
const LAYER2_DEFAULT_CEILING = 500

// Escapes carry their arithmetic, same discipline as the ceilings above.
const LAYER2_EXCEPTIONS = {
  // Absorbed startup-diagnostic, builder-diagnostic, and operating-principles in the DD-022
  // fold: 1,361 words became 637 by keeping the routing and dropping the question texts.
  // 637 x 1.05 = 669.
  'auto-frame/references/diagnostic.md': 669,
  // Absorbed content-intake: the two files defined the same four fields twice, once as an
  // elicitation bar and once as a SPEC field, and were the only pair in the content track
  // that co-loads. 948 words became 617. 617 x 1.05 = 648.
  'auto-frame/references/content-framing.md': 648,
  // Consent gate, dispatch boundary, round-capped loop, and result handling for a review that
  // sends plan content to another provider. Four contracts, none separable. 521 x 1.05 = 547.
  'auto-eng-review/references/outside-voice.md': 547
}

// Down-ratcheted after DD-022 pass 2, which cut what a capable model supplies unprompted:
// eleven trigger rows saying "check security when you touch auth", three prime directives
// restating zero-silent-failures and observability-scales-with-scope, a dependency graph
// mirroring the table beneath it, a worked slice whose calibrating sentence was one line of
// twelve, and an alternatives header restated verbatim as its own rules. Each total is the
// post-trim actual plus 5%.
const LAYER2_SKILL_TOTALS = {
  'auto-frame': 3150,
  'auto-execute': 2848,
  'auto-eng-review': 1525,
  'auto-verify': 906,
  'auto-plan': 817,
  'auto-resume': 711
}

const layer2Files = (skillName) =>
  ['references', 'role-sources']
    .map((sub) => join(skillsRoot, skillName, sub))
    .filter(existsSync)
    .flatMap((dir) =>
      readdirSync(dir)
        .filter((name) => name.endsWith('.md'))
        .map((name) => join(dir, name))
    )

test('conditional references stay under the layer 2 per-file ceiling', () => {
  for (const skillName of authoredSkills) {
    for (const file of layer2Files(skillName)) {
      const relative = file.slice(skillsRoot.length + 1).replaceAll('\\', '/')
      const ceiling = LAYER2_EXCEPTIONS[relative] ?? LAYER2_DEFAULT_CEILING
      const actual = readFileSync(file, 'utf8').split(/\s+/).filter(Boolean).length

      assert.ok(
        actual <= ceiling,
        `${relative} is ${actual} words, ceiling ${ceiling}: trim it, split it, or add a named escape ` +
          'to LAYER2_EXCEPTIONS with the arithmetic in the comment'
      )
    }
  }
})

test('per-skill conditional reference totals stay under their ceilings', () => {
  for (const [skillName, ceiling] of Object.entries(LAYER2_SKILL_TOTALS)) {
    const actual = layer2Files(skillName).reduce(
      (sum, file) => sum + readFileSync(file, 'utf8').split(/\s+/).filter(Boolean).length,
      0
    )

    assert.ok(
      actual <= ceiling,
      `${skillName} carries ${actual} words of conditional references, ceiling ${ceiling}: ` +
        'a new reference must earn its weight against the ones already there'
    )
  }

  const uncapped = authoredSkills.filter((skillName) => !(skillName in LAYER2_SKILL_TOTALS))
  assert.deepEqual(uncapped, [], 'every authored skill needs a layer 2 total ceiling')
})
