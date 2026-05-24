import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { scaffoldProject } from '../lib/scaffold.mjs'

test('scaffold creates steering, work, and nested runtime directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-scaffold-'))
  const paths = scaffoldProject(root)

  assert.equal(existsSync(join(paths.steeringRoot, 'PROJECT.md')), true)
  assert.equal(existsSync(join(paths.steeringRoot, 'REQUIREMENTS.md')), true)
  assert.equal(existsSync(join(paths.steeringRoot, 'ROADMAP.md')), true)
  assert.match(readFileSync(join(paths.steeringRoot, 'ROADMAP.md'), 'utf8'), /No roadmap phases yet/)
  assert.equal(existsSync(join(paths.steeringRoot, 'STATUS.md')), true)
  assert.equal(existsSync(paths.wikiRoot), true)
  assert.equal(existsSync(join(paths.agentRoot, 'work')), true)
  assert.equal(existsSync(join(paths.runtimeRoot, 'bin')), true)
  assert.equal(existsSync(join(paths.runtimeRoot, 'lib')), true)
  assert.equal(existsSync(join(paths.runtimeRoot, 'scripts')), true)
  assert.equal(existsSync(join(paths.runtimeRoot, 'state')), true)
  assert.equal(existsSync(join(paths.runtimeRoot, 'config')), true)
  assert.equal(existsSync(join(paths.runtimeRoot, 'cache')), true)
  assert.equal(existsSync(join(paths.runtimeRoot, 'logs')), true)
})

test('scaffold only seeds missing steering files', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-scaffold-'))
  const steeringRoot = join(root, '.agent', 'steering')
  const projectTarget = join(steeringRoot, 'PROJECT.md')

  mkdirSync(steeringRoot, { recursive: true })
  writeFileSync(projectTarget, 'custom project\n', 'utf8')

  const paths = scaffoldProject(root)

  assert.equal(readFileSync(projectTarget, 'utf8'), 'custom project\n')
  assert.equal(existsSync(join(paths.steeringRoot, 'REQUIREMENTS.md')), true)
  assert.equal(existsSync(join(paths.steeringRoot, 'ROADMAP.md')), true)
  assert.equal(existsSync(join(paths.steeringRoot, 'STATUS.md')), true)
})
