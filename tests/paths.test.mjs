// Runtime behavior: path resolution helpers for the .agent layout.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { automatonPaths } from '../lib/paths.mjs'

test('paths resolve .agent and nested .agent/.automaton roots', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-paths-'))
  const paths = automatonPaths(root)

  assert.equal(paths.root, resolve(root))
  assert.equal(paths.agentRoot, join(root, '.agent'))
  assert.equal(paths.runtimeRoot, join(root, '.agent', '.automaton'))
  assert.equal(paths.sharedReferencesRoot, join(root, '.agent', '.automaton', 'references'))
  assert.equal(paths.sharedScriptsRoot, join(root, '.agent', '.automaton', 'scripts'))
  assert.equal(paths.steeringRoot, join(root, '.agent', 'steering'))
  assert.equal(paths.wikiRoot, join(root, '.agent', 'wiki'))
  assert.equal(paths.workRoot, join(root, '.agent', 'work'))
})
