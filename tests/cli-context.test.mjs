import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { saveStatusSummary } from '../lib/status.mjs'

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
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'bin', 'update-state.mjs')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'lib', 'state.mjs')), true)

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

test('status command reports a STATUS.md mismatch without hiding current state', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-status-mismatch-'))
  const currentPath = join(root, '.agent', '.automaton', 'state', 'current.json')
  const statusPath = join(root, '.agent', 'steering', 'STATUS.md')
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(currentPath, '{\n  "active_change": "existing-change",\n  "stage": "execute"\n}\n', 'utf8')
  saveStatusSummary(statusPath, {
    activeChange: 'stale-change',
    stage: 'plan',
    whatIsTrueNow: ['STATUS.md was not refreshed after planning changed.'],
    nextStep: 'Refresh the project truth before ending the turn.',
    openRisks: ['Resume could follow the wrong next step.']
  })

  const result = spawnSync(process.execPath, [cliPath, 'status', root], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(
    result.stdout,
    'active change: existing-change\nstage: execute\nstatus file mismatch: STATUS.md says active change: stale-change, stage: plan\n'
  )
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

test('install --uninstall with a host flag removes only that host surface', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-'))

  const installResult = spawnSync(process.execPath, [cliPath, 'install', root, '--codex'], { encoding: 'utf8' })

  assert.equal(installResult.status, 0)
  assert.equal(existsSync(join(root, '.agent', 'steering', 'PROJECT.md')), true)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), true)

  const uninstallResult = spawnSync(process.execPath, [cliPath, 'install', root, '--uninstall', '--codex'], { encoding: 'utf8' })

  assert.equal(uninstallResult.status, 0)
  assert.equal(uninstallResult.stderr, '')
  assert.equal(uninstallResult.stdout, 'codex\n')
  assert.equal(existsSync(join(root, '.agent', 'steering', 'PROJECT.md')), true)
  assert.equal(existsSync(join(root, '.codex')), true)
  assert.equal(existsSync(join(root, '.agents')), false)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), false)
  assert.equal(existsSync(join(root, '.codex', 'hooks.json')), false)
})

test('install --uninstall with no host flags removes Automaton-managed files but leaves root folders', () => {
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
  assert.equal(existsSync(join(root, '.agent')), true)
  assert.equal(existsSync(join(root, '.claude')), true)
  assert.equal(existsSync(join(root, '.opencode')), true)
  assert.equal(existsSync(join(root, '.agent', 'steering', 'PROJECT.md')), true)
  assert.equal(existsSync(join(root, '.agent', 'steering', 'STATUS.md')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton')), false)
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')), false)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), false)
  assert.equal(existsSync(join(root, '.opencode', 'skills', 'auto-frame', 'SKILL.md')), false)

  const statusResult = spawnSync(process.execPath, [cliPath, 'status', root], { encoding: 'utf8' })

  assert.equal(statusResult.status, 0)
  assert.equal(statusResult.stderr, '')
  assert.equal(statusResult.stdout, 'active change: none\nstage: none\n')
})
