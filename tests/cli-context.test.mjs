// Runtime behavior: CLI install, status, and context commands against temp roots (DD-006).
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))

test('context command prints the retrieval summary for the requested stage', () => {
  const result = spawnSync(process.execPath, [cliPath, 'context', 'plan'], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, 'request -> steering -> work -> wiki\n')
})

test('status command reports none when no current state exists', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-status-'))
  const result = spawnSync(process.execPath, [cliPath, 'status', root], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, 'active change: none\nstage: none\n')
})

test('install command creates bootstrap state and status reports it', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-'))
  const agentRoot = join(root, '.agent')
  const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')

  const installResult = spawnSync(process.execPath, [cliPath, 'install', root], { encoding: 'utf8' })

  assert.equal(installResult.status, 0)
  assert.equal(installResult.stderr, '')
  assert.equal(installResult.stdout, 'agent\n')
  assert.equal(existsSync(agentRoot), true)
  assert.equal(
    readFileSync(currentPath, 'utf8'),
    '{\n  "active_change": "bootstrap",\n  "stage": "frame"\n}\n'
  )
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'lib', 'state.mjs')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'lib', 'contracts-data.json')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'scripts', 'get-context.mjs')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'scripts', 'sync-status.mjs')), true)

  const statusResult = spawnSync(process.execPath, [cliPath, 'status', root], { encoding: 'utf8' })

  assert.equal(statusResult.status, 0)
  assert.equal(statusResult.stderr, '')
  assert.equal(statusResult.stdout, 'active change: bootstrap\nstage: frame\n')
})

test('status command reads seeded durable snake_case current state', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-status-seeded-'))
  const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(
    currentPath,
    '{\n  "active_change": "automaton-v1-foundation",\n  "stage": "plan",\n  "canonical_design": "design.md",\n  "canonical_plan": "plan.md"\n}\n',
    'utf8'
  )

  const result = spawnSync(process.execPath, [cliPath, 'status', root], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, 'active change: automaton-v1-foundation\nstage: plan\n')
})

test('install command preserves existing durable snake_case current state', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-seeded-'))
  const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(
    currentPath,
    '{\n  "active_change": "existing-change",\n  "stage": "execute",\n  "canonical_design": "docs/design.md"\n}\n',
    'utf8'
  )

  const installResult = spawnSync(process.execPath, [cliPath, 'install', root], { encoding: 'utf8' })

  assert.equal(installResult.status, 0)
  assert.equal(installResult.stderr, '')
  assert.equal(
    readFileSync(currentPath, 'utf8'),
    '{\n  "active_change": "existing-change",\n  "stage": "execute",\n  "canonical_design": "docs/design.md"\n}\n'
  )

  const statusResult = spawnSync(process.execPath, [cliPath, 'status', root], { encoding: 'utf8' })

  assert.equal(statusResult.status, 0)
  assert.equal(statusResult.stderr, '')
  assert.equal(statusResult.stdout, 'active change: existing-change\nstage: execute\n')
})

test('install command removes stale runtime bin and replaces a pre-receipt manifest', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-no-manifest-'))
  const legacyBinRoot = join(root, '.agent', '.automaton', 'bin')
  const manifestTarget = join(root, '.agent', '.automaton', 'state', 'install-manifest.json')

  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  mkdirSync(legacyBinRoot, { recursive: true })
  writeFileSync(manifestTarget, '{"project":{"files":[]},"hosts":{}}\n', 'utf8')
  writeFileSync(join(legacyBinRoot, 'sync-status.mjs'), '// old runtime bin script\n', 'utf8')

  const installResult = spawnSync(process.execPath, [cliPath, 'install', root], { encoding: 'utf8' })

  assert.equal(installResult.status, 0)
  // The unrecognized pre-receipt manifest format is discarded and a schema-1
  // receipt takes its place (DD-011).
  assert.match(readFileSync(manifestTarget, 'utf8'), /"schema": 1/)
  assert.equal(existsSync(legacyBinRoot), false)
})

test('status command rejects an invalid durable stage from current state', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-status-invalid-stage-'))
  const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(
    currentPath,
    '{\n  "active_change": "existing-change",\n  "stage": "work"\n}\n',
    'utf8'
  )

  const result = spawnSync(process.execPath, [cliPath, 'status', root], { encoding: 'utf8' })

  assert.notEqual(result.status, 0)
  assert.equal(result.stdout, '')
  assert.match(result.stderr, /invalid stage: work/)
})

test('status command rejects durable current state missing the active change', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-status-missing-active-change-'))
  const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(currentPath, '{\n  "stage": "plan"\n}\n', 'utf8')

  const result = spawnSync(process.execPath, [cliPath, 'status', root], { encoding: 'utf8' })

  assert.notEqual(result.status, 0)
  assert.equal(result.stdout, '')
  assert.match(result.stderr, /invalid current state: missing active change/)
})

test('install command only provisions .agent when no host flags are passed', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-agent-only-'))

  const result = spawnSync(process.execPath, [cliPath, 'install', root], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, 'agent\n')
  assert.equal(existsSync(join(root, '.agent', 'steering', 'PROJECT.md')), true)
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')), false)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), false)
  assert.equal(existsSync(join(root, '.opencode', 'skills', 'auto-frame', 'SKILL.md')), false)
})

test('install command provisions the selected host surface and .agent scaffold', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-'))

  const result = spawnSync(process.execPath, [cliPath, 'install', root, '--codex'], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, 'agent\ncodex\n')
  assert.equal(existsSync(join(root, '.agent', 'steering', 'PROJECT.md')), true)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(existsSync(join(root, '.codex', 'hooks.json')), true)
})

test('install command provisions all host surfaces with --all', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-all-'))

  const result = spawnSync(process.execPath, [cliPath, 'install', '--all', root], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, 'agent\nclaude\ncodex\nopencode\n')
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(existsSync(join(root, '.opencode', 'skills', 'auto-frame', 'SKILL.md')), true)
})

test('install --uninstall with a host flag removes the runtime too when it was the last host', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-'))

  const installResult = spawnSync(process.execPath, [cliPath, 'install', root, '--codex'], { encoding: 'utf8' })

  assert.equal(installResult.status, 0)
  assert.equal(existsSync(join(root, '.agent', 'steering', 'PROJECT.md')), true)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), true)

  const uninstallResult = spawnSync(process.execPath, [cliPath, 'install', root, '--uninstall', '--codex'], { encoding: 'utf8' })

  assert.equal(uninstallResult.status, 0)
  assert.equal(uninstallResult.stderr, '')
  // Codex was the only installed host, so the shared runtime leaves with it
  // and a pristine project returns to zero trace (DD-011).
  assert.equal(uninstallResult.stdout, 'codex\nagent\n')
  assert.equal(existsSync(join(root, '.codex')), false)
  assert.equal(existsSync(join(root, '.agents')), false)
  assert.equal(existsSync(join(root, '.agent')), false)
})

test('install --uninstall with no host flags returns a pristine project to zero trace', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-all-'))

  const installResult = spawnSync(process.execPath, [cliPath, 'install', root, '--claude', '--opencode'], { encoding: 'utf8' })

  assert.equal(installResult.status, 0)
  assert.equal(existsSync(join(root, '.agent')), true)
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(existsSync(join(root, '.opencode', 'skills', 'auto-frame', 'SKILL.md')), true)

  const uninstallResult = spawnSync(process.execPath, [cliPath, 'install', root, '--uninstall'], { encoding: 'utf8' })

  assert.equal(uninstallResult.status, 0)
  assert.equal(uninstallResult.stderr, '')
  assert.equal(uninstallResult.stdout, 'claude\ncodex\nopencode\nagent\n')
  // Nothing on this root predated Automaton and nothing was touched after
  // install, so uninstall leaves no trace: directories it created are pruned
  // and hash-pristine steering placeholders carry no project history (DD-011).
  assert.equal(existsSync(join(root, '.agent')), false)
  assert.equal(existsSync(join(root, '.claude')), false)
  assert.equal(existsSync(join(root, '.opencode')), false)
  assert.equal(existsSync(join(root, '.codex')), false)

  const statusResult = spawnSync(process.execPath, [cliPath, 'status', root], { encoding: 'utf8' })

  assert.equal(statusResult.status, 0)
  assert.equal(statusResult.stderr, '')
  assert.equal(statusResult.stdout, 'active change: none\nstage: none\n')
})
