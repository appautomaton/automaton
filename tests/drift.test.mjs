// Drift detection: `automaton status` warns when a project's installed copies
// no longer match the CLI source (missing receipt, version skew, orphaned
// skills). Failure story: a stale pre-receipt install kept an orphaned
// `auto-ceo-review` running against a runtime that rejects its state flag,
// and nothing surfaced it; driftReport makes that visible at orientation time.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { driftReport } from '../lib/drift.mjs'
import { installHost, installProject } from '../lib/install.mjs'
import { receiptPath } from '../lib/receipt.mjs'
import { getHost } from '../hosts/index.mjs'

const sourceRoot = fileURLToPath(new URL('..', import.meta.url))

function tempRoot(label) {
  return mkdtempSync(join(tmpdir(), `automaton-drift-${label}-`))
}

test('no runtime root means no drift warnings', () => {
  const root = tempRoot('empty')
  assert.deepEqual(driftReport(root, { sourceRoot }), [])
  rmSync(root, { recursive: true, force: true })
})

test('a fresh install reports no drift', () => {
  const root = tempRoot('fresh')
  installProject(root, { sourceRoot })
  installHost(getHost('claude'), { root, sourceRoot })
  assert.deepEqual(driftReport(root, { sourceRoot }), [])
  rmSync(root, { recursive: true, force: true })
})

test('a pre-receipt install reports missing_receipt', () => {
  const root = tempRoot('noreceipt')
  installProject(root, { sourceRoot })
  rmSync(receiptPath(root))
  const codes = driftReport(root, { sourceRoot }).map((warning) => warning.code)
  assert.ok(codes.includes('missing_receipt'), 'a receiptless install must be flagged')
  rmSync(root, { recursive: true, force: true })
})

test('a version mismatch reports version_drift for the stale owner', () => {
  const root = tempRoot('version')
  installProject(root, { sourceRoot })
  const manifest = JSON.parse(readFileSync(receiptPath(root), 'utf8'))
  manifest.owners.project.automaton_version = '0.0.0-older'
  writeFileSync(receiptPath(root), JSON.stringify(manifest, null, 2) + '\n')
  const drift = driftReport(root, { sourceRoot }).find((warning) => warning.code === 'version_drift')
  assert.ok(drift, 'a stale installed version must be flagged')
  assert.match(drift.message, /for project/, 'the warning must name which owner is stale')
  rmSync(root, { recursive: true, force: true })
})

// Hosts install independently: installing codex with a newer CLI must not
// hide that claude's copies are still old. Failure story: the receipt's
// single global version stamp was overwritten by every install pass, so a
// later `install --codex` silenced the drift warning for a stale claude.
test('version drift is per host, not one global stamp', () => {
  const root = tempRoot('per-owner')
  installHost(getHost('claude'), { root, sourceRoot })
  installHost(getHost('codex'), { root, sourceRoot })
  const manifest = JSON.parse(readFileSync(receiptPath(root), 'utf8'))
  manifest.owners.claude.automaton_version = '0.0.0-older'
  writeFileSync(receiptPath(root), JSON.stringify(manifest, null, 2) + '\n')

  const drifts = driftReport(root, { sourceRoot }).filter((warning) => warning.code === 'version_drift')
  assert.equal(drifts.length, 1, 'only the stale host may be flagged')
  assert.match(drifts[0].message, /for claude/, 'the stale host is named')
  assert.match(drifts[0].message, /reinstall --claude/, 'the remedy is host-scoped')
  rmSync(root, { recursive: true, force: true })
})

// A mixed-era receipt: one host installed by a pre-stamp CLI (entries, no
// stamp), another by a stamp-aware CLI. The unstamped host must be reported
// as unrecorded, never assumed current — otherwise the blind spot the stamps
// exist to close reopens for exactly the installs that most need upgrading.
// (Absence of a stamp proves a pre-stamp installer: downgrade rewrites are
// explicitly out of scope.)
test('an owner with entries but no version stamp is reported, not assumed current', () => {
  const root = tempRoot('mixed-era')
  installHost(getHost('claude'), { root, sourceRoot })
  installHost(getHost('codex'), { root, sourceRoot })
  const manifest = JSON.parse(readFileSync(receiptPath(root), 'utf8'))
  delete manifest.owners.claude
  writeFileSync(receiptPath(root), JSON.stringify(manifest, null, 2) + '\n')

  const drifts = driftReport(root, { sourceRoot }).filter((warning) => warning.code === 'version_drift')
  assert.equal(drifts.length, 1, 'only the unstamped host may be flagged')
  assert.match(drifts[0].message, /version unrecorded\) for claude/, 'the unstamped host is named as unrecorded')
  assert.match(drifts[0].message, /reinstall --claude/, 'the remedy is host-scoped')
  rmSync(root, { recursive: true, force: true })
})

// Receipts written before per-owner records carry no owners map; drift must
// degrade to the historical global comparison, never go silent.
test('a receipt without owner records falls back to the global version check', () => {
  const root = tempRoot('fallback')
  installProject(root, { sourceRoot })
  const manifest = JSON.parse(readFileSync(receiptPath(root), 'utf8'))
  delete manifest.owners
  manifest.automaton_version = '0.0.0-older'
  writeFileSync(receiptPath(root), JSON.stringify(manifest, null, 2) + '\n')
  const drift = driftReport(root, { sourceRoot }).find((warning) => warning.code === 'version_drift')
  assert.ok(drift, 'a stale pre-owner-stamp receipt must still be flagged')
  assert.match(drift.message, /installed automaton 0\.0\.0-older, this CLI is/)
  rmSync(root, { recursive: true, force: true })
})

test('a user skill named auto-something is not drift and is never pruned', () => {
  // Drift reports only names automaton is known to have retired (DD-020). An
  // `auto-*` directory that is neither current nor retired belongs to the user,
  // the installer will never touch it, so warning about it is noise.
  const root = tempRoot('user-auto-skill')
  installProject(root, { sourceRoot })
  installHost(getHost('claude'), { root, sourceRoot })
  mkdirSync(join(root, '.claude', 'skills', 'auto-my-own-thing'), { recursive: true })
  writeFileSync(join(root, '.claude', 'skills', 'auto-my-own-thing', 'SKILL.md'), '# mine\n')
  assert.deepEqual(driftReport(root, { sourceRoot }), [])
  rmSync(root, { recursive: true, force: true })
})

test('an installed automaton skill absent from source reports orphaned_skill', () => {
  const root = tempRoot('orphan')
  installProject(root, { sourceRoot })
  installHost(getHost('claude'), { root, sourceRoot })
  mkdirSync(join(root, '.claude', 'skills', 'auto-ceo-review'), { recursive: true })
  writeFileSync(join(root, '.claude', 'skills', 'auto-ceo-review', 'SKILL.md'), '# orphan\n')
  const orphan = driftReport(root, { sourceRoot }).find((warning) => warning.code === 'orphaned_skill')
  assert.ok(orphan, 'the orphaned skill must be reported')
  assert.match(orphan.message, /auto-ceo-review/)
  rmSync(root, { recursive: true, force: true })
})

test('user skill directories in the host root are not drift', () => {
  const root = tempRoot('user-skill')
  installProject(root, { sourceRoot })
  installHost(getHost('claude'), { root, sourceRoot })
  mkdirSync(join(root, '.claude', 'skills', 'my-own-skill'), { recursive: true })
  writeFileSync(join(root, '.claude', 'skills', 'my-own-skill', 'SKILL.md'), '# mine\n')
  assert.deepEqual(driftReport(root, { sourceRoot }), [])
  rmSync(root, { recursive: true, force: true })
})
