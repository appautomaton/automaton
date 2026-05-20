import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

test('scaffold-agent script scaffolds the target root and prints paths json', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-scaffold-script-'))
  const script = fileURLToPath(new URL('../skills/_shared/scripts/scaffold-agent.mjs', import.meta.url))

  const output = execFileSync(process.execPath, [script, root], { encoding: 'utf8' })
  const paths = JSON.parse(output)

  assert.equal(paths.root, root)
  assert.equal(existsSync(join(root, '.agent', 'steering', 'PROJECT.md')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'bin')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'lib')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'state')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'config')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'cache')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'logs')), true)
  assert.equal(
    readFileSync(join(root, '.agent', '.automaton', 'state', 'current.json'), 'utf8'),
    '{\n  "active_change": "bootstrap",\n  "stage": "frame"\n}\n'
  )
  assert.equal(
    readFileSync(join(root, '.agent', 'steering', 'STATUS.md'), 'utf8'),
    '# Status\n\n## Current Change\n\n- active change: `bootstrap`\n- current stage: `frame`\n\n## What Is True Now\n\n- none recorded\n\n## Next Step\n\nRun `auto-onboard` to refresh project truth for the repository before continuing.\n\n## Open Risks\n\n- none recorded\n'
  )
})

test('scaffold-agent script is idempotent and preserves existing files', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-scaffold-script-idempotent-'))
  const script = fileURLToPath(new URL('../skills/_shared/scripts/scaffold-agent.mjs', import.meta.url))

  execFileSync(process.execPath, [script, root], { encoding: 'utf8' })
  writeFileSync(join(root, '.agent', 'steering', 'PROJECT.md'), 'custom project\n', 'utf8')

  const output = execFileSync(process.execPath, [script, root], { encoding: 'utf8' })
  const paths = JSON.parse(output)

  assert.deepEqual(paths.created, [])
  assert.equal(readFileSync(join(root, '.agent', 'steering', 'PROJECT.md'), 'utf8'), 'custom project\n')
})
