// Install-host behavior: full-tree install from arbitrary locations. Slow by design (copies the
// whole source tree). Keep scenarios minimal, cheap walks belong in lifecycle-walk.test.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, cpSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildCli } from '../bin/automaton.mjs'

function copySourceFixture(source, target) {
  cpSync(source, target, {
    recursive: true,
    filter: (sourcePath) => !sourcePath.split(/[\\/]/).includes('.git')
  })
}

test('cli exposes install, context, status, and validate commands', () => {
  const cli = buildCli()

  assert.deepEqual(cli.commands, ['install', 'context', 'status', 'validate'])
})

test('cli prints commands when executed from a path with spaces', () => {
  const automatonSourcePath = fileURLToPath(new URL('../', import.meta.url))
  const tempRoot = mkdtempSync(join(tmpdir(), 'automaton cli '))
  const automatonPath = join(tempRoot, 'workspace with spaces')
  const cliPath = join(automatonPath, 'bin', 'automaton.mjs')

  copySourceFixture(automatonSourcePath, automatonPath)

  const result = spawnSync(process.execPath, [cliPath], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, 'install\ncontext\nstatus\nvalidate\n')
})

test('cli prints commands when executed through a symlinked bin path', () => {
  const automatonSourcePath = fileURLToPath(new URL('../', import.meta.url))
  const tempRoot = mkdtempSync(join(tmpdir(), 'automaton cli symlink-'))
  const copiedAutomatonPath = join(tempRoot, 'copied', 'automaton')
  const targetCliPath = join(copiedAutomatonPath, 'bin', 'automaton.mjs')
  const symlinkCliPath = join(tempRoot, 'automaton-link.mjs')

  copySourceFixture(automatonSourcePath, copiedAutomatonPath)
  symlinkSync(targetCliPath, symlinkCliPath)

  const result = spawnSync(process.execPath, [symlinkCliPath], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, 'install\ncontext\nstatus\nvalidate\n')
})
