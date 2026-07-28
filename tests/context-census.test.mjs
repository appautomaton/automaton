import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillsRoot } from './support/skill-helpers.mjs'

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
  '_shared/references/FRAMEWORK.md': 890,
  '_shared/references/ARTIFACT-LIFECYCLE.md': 1940,
  '_shared/references/CONTEXT-BUDGET.md': 585,
  // Raised 1100 -> 1350 for DD-013: evidence-over-signal completion, BLOCKED
  // triage, and parallel worktree isolation are new coordination capability,
  // not restated prose.
  '_shared/references/SUBAGENT-PROTOCOL.md': 1350,
  '_shared/references/LIBRARIAN.md': 380,
  '_shared/references/ANTI-SLOP.md': 270,
  '_shared/references/ROADMAP-CONTRACT.md': 670
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
  'auto-frame/SKILL.md': 1400,
  'auto-verify/SKILL.md': 1000,
  'auto-eng-review/SKILL.md': 750,
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
    files: ['_shared/references/FRAMEWORK.md', 'auto-frame/SKILL.md'],
    ceiling: 2300
  },
  'plan': {
    files: ['_shared/references/FRAMEWORK.md', 'auto-plan/SKILL.md', '_shared/references/ARTIFACT-LIFECYCLE.md'],
    ceiling: 4030
  },
  'execute direct route': {
    files: [
      '_shared/references/FRAMEWORK.md',
      'auto-execute/SKILL.md',
      '_shared/references/ARTIFACT-LIFECYCLE.md',
      '_shared/references/CONTEXT-BUDGET.md'
    ],
    ceiling: 5250
  },
  'execute subagent route': {
    files: [
      '_shared/references/FRAMEWORK.md',
      'auto-execute/SKILL.md',
      '_shared/references/ARTIFACT-LIFECYCLE.md',
      '_shared/references/CONTEXT-BUDGET.md',
      '_shared/references/SUBAGENT-PROTOCOL.md'
    ],
    ceiling: 6620
  },
  'verify': {
    files: ['_shared/references/FRAMEWORK.md', 'auto-verify/SKILL.md', '_shared/references/ARTIFACT-LIFECYCLE.md'],
    ceiling: 3800
  }
}

test('stage working sets stay under their word ceilings', () => {
  for (const [stage, { files, ceiling }] of Object.entries(WORKING_SETS)) {
    const actual = files.reduce((sum, file) => sum + words(file), 0)
    assert.ok(actual <= ceiling, `${stage} working set is ${actual} words, ceiling ${ceiling}: trim a member or consciously raise the ceiling`)
  }
})
