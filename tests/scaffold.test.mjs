// Runtime behavior: .agent scaffolding seeds durable state only when missing (DD-001).
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { scaffoldProject } from '../lib/scaffold.mjs'
import { createRecorder } from '../lib/receipt.mjs'

test('scaffold creates steering, work, and nested runtime directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-scaffold-'))
  const paths = scaffoldProject(root)

  assert.equal(existsSync(join(paths.steeringRoot, 'PROJECT.md')), true)
  assert.equal(existsSync(join(paths.steeringRoot, 'REQUIREMENTS.md')), true)
  assert.equal(existsSync(join(paths.steeringRoot, 'ROADMAP.md')), true)
  assert.match(readFileSync(join(paths.steeringRoot, 'ROADMAP.md'), 'utf8'), /No active roadmap/)
  assert.equal(existsSync(join(paths.steeringRoot, 'STATUS.md')), false)
  assert.equal(existsSync(paths.wikiRoot), true)
  assert.equal(existsSync(join(paths.agentRoot, 'work')), true)
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
})

// Deprecated steering removal follows the DD-011 asymmetry rule: only a
// hash-pristine placeholder may be deleted. Failure story: STATUS.md accreted
// "What Is True Now" project history in real installs, and the old
// unconditional rmSync destroyed it silently on every reinstall.
test('deprecated STATUS.md is removed only while hash-pristine', () => {
  const pristineVariants = [
    '# Status\n\nRecord the active change, stage, and next step.\n',
    '# Status\n\n## What Is True Now\n\n- none recorded\n\n## Next Step\n\nRun `auto-onboard` to refresh project truth for the repository before continuing.\n\n## Open Risks\n\n- none recorded\n'
  ]

  for (const variant of pristineVariants) {
    const root = mkdtempSync(join(tmpdir(), 'automaton-scaffold-status-'))
    const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')
    mkdirSync(join(root, '.agent', 'steering'), { recursive: true })
    writeFileSync(statusTarget, variant, 'utf8')

    scaffoldProject(root)

    assert.equal(existsSync(statusTarget), false, 'a pristine deprecated placeholder carries no record and is removed')
  }
})

test('deprecated STATUS.md with accreted content is kept and reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-scaffold-status-kept-'))
  const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')
  const accreted = '# Status\n\n## What Is True Now\n\n- the API layer is fully migrated\n'
  mkdirSync(join(root, '.agent', 'steering'), { recursive: true })
  writeFileSync(statusTarget, accreted, 'utf8')

  const recorder = createRecorder(root, 'project')
  scaffoldProject(root, recorder)

  assert.equal(readFileSync(statusTarget, 'utf8'), accreted, 'touched steering is project history and must survive')
  const kept = recorder.warnings.find((warning) => warning.code === 'kept_modified_file')
  assert.ok(kept, 'the kept file must be reported, never preserved silently')
  assert.match(kept.message, /STATUS\.md/)
})
