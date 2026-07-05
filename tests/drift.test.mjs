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

test('a version mismatch reports version_drift', () => {
  const root = tempRoot('version')
  installProject(root, { sourceRoot })
  const manifest = JSON.parse(readFileSync(receiptPath(root), 'utf8'))
  manifest.automaton_version = '0.0.0-older'
  writeFileSync(receiptPath(root), JSON.stringify(manifest, null, 2) + '\n')
  const codes = driftReport(root, { sourceRoot }).map((warning) => warning.code)
  assert.ok(codes.includes('version_drift'), 'a stale installed version must be flagged')
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
