// Install lifecycle receipt (DD-011): install records the facts only the
// install moment can observe. Files written (hashed), directories created
// because they did not exist before, config fragments merged into shared host
// files. Uninstall and upgrade act on the receipt, so cleanup matches what
// THIS project actually received instead of what the current source tree
// would install today.
// Failure story: without the receipt, uninstall could only recompute the
// removal set from the current source. It could not tell a pre-existing
// `.claude/` from one Automaton created, left orphans behind after renames,
// and clobbered or stripped user-owned config without knowing it. A failing
// pin here means install/uninstall symmetry broke: fix the lifecycle, do not
// relax the pin.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { installHost, uninstallHost, installProject, uninstallProject } from '../lib/install.mjs'
import { hashContent, loadReceipt, receiptPath, saveReceipt, warning } from '../lib/receipt.mjs'
import { getHost } from '../hosts/index.mjs'

const sourceRoot = fileURLToPath(new URL('..', import.meta.url))
const cliPath = fileURLToPath(new URL('../bin/automaton.mjs', import.meta.url))
const packageVersion = JSON.parse(readFileSync(join(sourceRoot, 'package.json'), 'utf8')).version

function tempRoot(label) {
  return mkdtempSync(join(tmpdir(), `automaton-receipt-${label}-`))
}

test('install writes a schema-1 receipt with hashed, owner-tagged entries', () => {
  const root = tempRoot('shape')

  installHost(getHost('claude'), { root, sourceRoot })

  const receipt = loadReceipt(root)
  assert.ok(receipt, 'install must write a loadable receipt')
  assert.equal(receipt.schema, 1)
  assert.equal(receipt.automatonVersion, packageVersion, 'receipt must carry the installer version for upgrade reporting')
  assert.ok(receipt.installedAt, 'receipt must carry the install timestamp')

  const owners = new Set(receipt.files.map((entry) => entry.owner))
  assert.deepEqual([...owners].sort(), ['claude', 'project'], 'file entries are tagged per owner')

  for (const entry of receipt.files) {
    assert.match(entry.hash, /^[0-9a-f]{64}$/, `${entry.path} must carry a sha256 content hash`)
  }

  // Spot-check the major surfaces: a skill copy, a generated agent, a hook
  // script, and the steering scaffold all appear.
  const paths = new Set(receipt.files.map((entry) => entry.path))
  assert.ok(paths.has('.claude/skills/auto-frame/SKILL.md'))
  assert.ok(paths.has('.claude/agents/automaton-implementer.md'))
  assert.ok(paths.has('.claude/hooks/session-start.mjs'))
  assert.ok(paths.has('.agent/steering/ROADMAP.md'))

  // Runtime machinery under .agent/.automaton is namespace-owned and removed
  // whole on uninstall; it is intentionally absent from file tracking.
  assert.equal([...paths].some((p) => p.startsWith('.agent/.automaton/')), false)

  // Shared configs are merges, not owned files.
  const mergePaths = receipt.merges.map((entry) => entry.path)
  assert.deepEqual(mergePaths, ['.claude/settings.json'])
  assert.ok(receipt.merges[0].fragments.includes('.claude/hooks/session-start.mjs'))

  // The durable file is snake_case like every other durable artifact (DD-002).
  const raw = readFileSync(receiptPath(root), 'utf8')
  assert.match(raw, /"automaton_version"/)
  assert.match(raw, /"created_dirs"/)
  assert.doesNotMatch(raw, /"createdDirs"/)
})

test('directory provenance: pre-existing host directories are never recorded as created', () => {
  const root = tempRoot('provenance')
  mkdirSync(join(root, '.claude', 'skills'), { recursive: true })

  installHost(getHost('claude'), { root, sourceRoot })

  const created = new Set(loadReceipt(root).createdDirs.map((entry) => entry.path))
  assert.equal(created.has('.claude'), false, '.claude existed before install')
  assert.equal(created.has('.claude/skills'), false, '.claude/skills existed before install')
  assert.ok(created.has('.claude/skills/auto-frame'), 'directories install created are recorded')
  assert.ok(created.has('.agent'), 'the .agent scaffold root is recorded when install created it')
})

test('uninstalling the last host via the CLI leaves zero trace on a pristine project', () => {
  const root = tempRoot('zero-trace')

  const install = spawnSync(process.execPath, [cliPath, 'install', '--claude', root], { encoding: 'utf8' })
  assert.equal(install.status, 0)
  assert.equal(install.stderr, '', 'a pristine install must produce no warnings')

  const uninstall = spawnSync(process.execPath, [cliPath, 'install', '--uninstall', '--claude', root], { encoding: 'utf8' })
  assert.equal(uninstall.status, 0)
  assert.equal(uninstall.stderr, '')
  // The last installed host takes the shared runtime with it.
  assert.equal(uninstall.stdout, 'claude\nagent\n')
  assert.deepEqual(readdirSync(root), [], 'nothing Automaton created may remain')
})

test('a host-scoped uninstall keeps the runtime while another host remains installed', () => {
  const root = tempRoot('two-hosts')

  installHost(getHost('claude'), { root, sourceRoot })
  installHost(getHost('codex'), { root, sourceRoot })

  const uninstall = spawnSync(process.execPath, [cliPath, 'install', '--uninstall', '--claude', root], { encoding: 'utf8' })
  assert.equal(uninstall.status, 0)
  assert.equal(uninstall.stdout, 'claude\n', 'the runtime must not be removed while codex is installed')
  assert.equal(existsSync(join(root, '.claude')), false)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'state', 'current.json')), true)
})

// Shared-config preservation is semantic, not byte-exact: merged JSON is
// reparsed and reserialized, so user ENTRIES always survive while formatting
// is normalized to pretty-printed two-space JSON. This test's settings input
// is already in that shape, which is what makes the byte comparison valid.
test('uninstall preserves user content in shared host directories', () => {
  const root = tempRoot('user-content')
  const userSettings = '{\n  "permissions": {\n    "allow": [\n      "Bash(npm test)"\n    ]\n  }\n}\n'
  mkdirSync(join(root, '.claude', 'skills', 'my-skill'), { recursive: true })
  mkdirSync(join(root, '.claude', 'agents'), { recursive: true })
  writeFileSync(join(root, '.claude', 'settings.json'), userSettings, 'utf8')
  writeFileSync(join(root, '.claude', 'skills', 'my-skill', 'SKILL.md'), '# my skill\n', 'utf8')
  writeFileSync(join(root, '.claude', 'agents', 'my-agent.md'), 'user agent\n', 'utf8')

  installHost(getHost('claude'), { root, sourceRoot })
  uninstallHost(getHost('claude'), { root, sourceRoot })
  uninstallProject(root)

  assert.equal(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'), userSettings, 'user settings restored byte-exact')
  assert.equal(existsSync(join(root, '.claude', 'skills', 'my-skill', 'SKILL.md')), true)
  assert.equal(existsSync(join(root, '.claude', 'agents', 'my-agent.md')), true)
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame')), false)
  assert.equal(existsSync(join(root, '.claude', 'agents', 'automaton-implementer.md')), false)
  assert.equal(existsSync(join(root, '.claude', 'hooks')), false)
})

test('uninstall keeps touched steering as project history and removes pristine placeholders', () => {
  const root = tempRoot('history')

  installProject(root, { sourceRoot })
  // The user recorded real roadmap phases; work artifacts exist.
  writeFileSync(join(root, '.agent', 'steering', 'ROADMAP.md'), '# Roadmap\n\n## Phase 1: Ship it\n', 'utf8')
  mkdirSync(join(root, '.agent', 'work', '2026-06-12-change'), { recursive: true })
  writeFileSync(join(root, '.agent', 'work', '2026-06-12-change', 'SPEC.md'), '# SPEC\n', 'utf8')

  const result = uninstallProject(root)

  assert.equal(existsSync(join(root, '.agent', 'steering', 'ROADMAP.md')), true, 'modified steering is history and stays')
  assert.equal(existsSync(join(root, '.agent', 'work', '2026-06-12-change', 'SPEC.md')), true, 'work artifacts always stay')
  assert.equal(existsSync(join(root, '.agent', '.automaton')), false, 'machinery always goes')
  assert.ok(
    result.warnings.some((warning) => warning.message.includes('.agent/steering/ROADMAP.md')),
    'the kept file is reported, not silently skipped'
  )

  // The other half of the asymmetry: an untouched placeholder carries no record.
  const pristine = tempRoot('history-pristine')
  installProject(pristine, { sourceRoot })
  uninstallProject(pristine)

  assert.equal(
    existsSync(join(pristine, '.agent', 'steering', 'ROADMAP.md')),
    false,
    'pristine placeholder carries no record and goes'
  )
})

test('upgrade removes pristine orphans from the previous receipt and keeps modified ones with a warning', () => {
  const root = tempRoot('orphans')

  installHost(getHost('claude'), { root, sourceRoot })

  // Simulate files a previous version shipped that this version no longer
  // does: one left pristine, one locally modified.
  const receipt = loadReceipt(root)
  const pristine = '.claude/skills/auto-frame/references/RETIRED.md'
  const modified = '.claude/skills/auto-frame/references/RETIRED-EDITED.md'
  writeFileSync(join(root, pristine), 'retired content\n', 'utf8')
  writeFileSync(join(root, modified), 'user edits on top\n', 'utf8')
  receipt.files.push(
    { path: pristine, hash: hashContent('retired content\n'), owner: 'claude' },
    { path: modified, hash: hashContent('shipped content\n'), owner: 'claude' }
  )
  saveReceipt(root, receipt)

  const result = installHost(getHost('claude'), { root, sourceRoot })

  assert.equal(existsSync(join(root, pristine)), false, 'pristine orphan is cleaned up')
  assert.equal(existsSync(join(root, modified)), true, 'modified orphan is preserved')
  assert.ok(
    result.warnings.some((warning) => warning.code === 'kept_modified_file' && warning.message.includes(modified)),
    'the kept orphan is reported'
  )
  const next = loadReceipt(root)
  assert.equal(next.files.some((entry) => entry.path === pristine), false)
})

// Upgrade proof for a retired skill: when a whole skill directory the previous
// version shipped (auto-ceo-review, removed 2026-07) is absent from the new
// source, re-install must prune every pristine file it owned and the emptied
// directories, leaving no trace in the tree or the receipt.
test('upgrade prunes a whole skill directory the source no longer ships', () => {
  const root = tempRoot('retired-skill')

  installHost(getHost('claude'), { root, sourceRoot })

  const receipt = loadReceipt(root)
  const retired = [
    '.claude/skills/auto-retired-review/SKILL.md',
    '.claude/skills/auto-retired-review/references/checklist.md',
    '.claude/skills/auto-retired-review/references/quality.md'
  ]
  mkdirSync(join(root, '.claude', 'skills', 'auto-retired-review', 'references'), { recursive: true })
  for (const path of retired) {
    writeFileSync(join(root, path), 'shipped by a previous version\n', 'utf8')
    receipt.files.push({ path, hash: hashContent('shipped by a previous version\n'), owner: 'claude' })
  }
  saveReceipt(root, receipt)

  installHost(getHost('claude'), { root, sourceRoot })

  assert.equal(
    existsSync(join(root, '.claude', 'skills', 'auto-retired-review')),
    false,
    'the retired skill directory must be fully pruned on upgrade'
  )
  const next = loadReceipt(root)
  assert.equal(
    next.files.some((entry) => entry.path.includes('auto-retired-review')),
    false,
    'the receipt must carry no entries for the retired skill'
  )
})

// Per-owner install records (DD-011): hosts install independently, so the
// receipt records which automaton version last installed EACH owner, and
// when. Failure story: a later `install --codex` overwrote the single global
// stamps and silenced the drift warning for a claude install still on an
// older version.
test('each install records its owner version and time; uninstall removes exactly that record', () => {
  const root = tempRoot('owner-records')

  installHost(getHost('claude'), { root, sourceRoot })
  installHost(getHost('codex'), { root, sourceRoot })

  const receipt = loadReceipt(root)
  for (const owner of ['project', 'claude', 'codex']) {
    assert.equal(receipt.owners[owner]?.automatonVersion, packageVersion, `${owner} carries the version that last installed it`)
    assert.ok(receipt.owners[owner]?.installedAt, `${owner} carries the time it was last installed`)
  }

  const raw = JSON.parse(readFileSync(receiptPath(root), 'utf8'))
  assert.ok(raw.owners.claude.automaton_version, 'owner record keys are snake_case (DD-002)')
  assert.ok(raw.owners.claude.installed_at, 'owner record keys are snake_case (DD-002)')

  uninstallHost(getHost('claude'), { root, sourceRoot })

  assert.deepEqual(
    Object.keys(loadReceipt(root).owners).sort(),
    ['codex', 'project'],
    'uninstalling a host must drop its record and no other'
  )
})

// The CLI warning vocabulary has one home (WARNING_CODES) and one constructor
// that rejects strays, so a typo'd code fails at emission instead of shipping
// as a new accidental vocabulary entry no test or reader knows about.
test('the CLI warning vocabulary is closed: unknown codes throw at construction', () => {
  assert.throws(() => warning('not_a_code', 'nope'), /unknown warning code/)
  assert.deepEqual(
    warning('kept_modified_file', 'kept'),
    { level: 'warning', code: 'kept_modified_file', message: 'kept' }
  )
})

test('a receipt with no entries for a host makes that host uninstall a no-op', () => {
  const root = tempRoot('absent-host')

  installHost(getHost('codex'), { root, sourceRoot })
  // The user owns a directory that collides with an automaton skill name.
  // A source-recompute fallback would delete it; the receipt knows better.
  mkdirSync(join(root, '.claude', 'skills', 'auto-frame'), { recursive: true })
  writeFileSync(join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md'), '# user skill\n', 'utf8')

  const result = uninstallHost(getHost('claude'), { root, sourceRoot })

  assert.equal(
    readFileSync(join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md'), 'utf8'),
    '# user skill\n',
    'a host absent from the receipt must not be removed by source recompute'
  )
  assert.ok(
    result.warnings.some((warning) => warning.code === 'unrecorded_host_install'),
    'automaton-named traces the receipt cannot account for are reported, not deleted'
  )
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), true, 'the installed host is untouched')
})

test('first install over a colliding user skill directory reports the replacement', () => {
  const root = tempRoot('collision')
  mkdirSync(join(root, '.claude', 'skills', 'auto-frame'), { recursive: true })
  writeFileSync(join(root, '.claude', 'skills', 'auto-frame', 'NOTES.md'), 'mine\n', 'utf8')

  const result = installHost(getHost('claude'), { root, sourceRoot })

  assert.ok(
    result.warnings.some((warning) =>
      warning.code === 'overwrote_existing_file' && warning.message.includes('.claude/skills/auto-frame/NOTES.md')
    ),
    'a user file destroyed by the skill sync is reported, never silent'
  )
})

test('first install over a colliding user skill FILE warns instead of crashing', () => {
  const root = tempRoot('file-collision')
  // The colliding path is a file where automaton expects a directory.
  mkdirSync(join(root, '.claude', 'skills'), { recursive: true })
  writeFileSync(join(root, '.claude', 'skills', 'auto-frame'), 'user file\n', 'utf8')

  const result = installHost(getHost('claude'), { root, sourceRoot })

  assert.ok(
    result.warnings.some((warning) =>
      warning.code === 'overwrote_existing_file' && warning.message.includes('.claude/skills/auto-frame')
    ),
    'the replaced file is reported'
  )
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')), true, 'the skill installs in its place')
})

test('a corrupt receipt cannot delete outside the project root', () => {
  const root = tempRoot('escape')
  const victim = `${root}-victim.txt`
  writeFileSync(victim, 'outside\n', 'utf8')

  installProject(root, { sourceRoot })
  const receipt = loadReceipt(root)
  receipt.files.push({ path: `../${victim.split('/').pop()}`, hash: null, owner: 'project' })
  receipt.createdDirs.push({ path: '.', owner: 'project' })
  saveReceipt(root, receipt)

  const loaded = loadReceipt(root)
  assert.equal(
    loaded.files.some((entry) => entry.path.startsWith('..')),
    false,
    'traversal entries are discarded at the load boundary'
  )
  assert.equal(
    loaded.createdDirs.some((entry) => entry.path === '.'),
    false,
    'a root-aliasing "." entry is discarded, so pruneCreatedDirs can never remove the project root'
  )

  uninstallProject(root)

  assert.equal(readFileSync(victim, 'utf8'), 'outside\n', 'the file outside the project survives')
  rmSync(victim, { force: true })
})

test('upgrade strips hook fragments a previous version recorded but this one no longer ships', () => {
  const root = tempRoot('stale-merge')

  installHost(getHost('claude'), { root, sourceRoot })

  // Simulate a previous version's footprint: a retired hook script, its
  // settings entry, and both recorded in the receipt.
  const settingsPath = join(root, '.claude', 'settings.json')
  const retired = '.claude/hooks/retired-start.mjs'
  writeFileSync(join(root, retired), 'retired\n', 'utf8')
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
  settings.hooks.SessionStart.push({ hooks: [{ type: 'command', command: `node ${retired}` }] })
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8')
  const receipt = loadReceipt(root)
  receipt.files.push({ path: retired, hash: hashContent('retired\n'), owner: 'claude' })
  receipt.merges.find((entry) => entry.path === '.claude/settings.json').fragments.push(retired)
  saveReceipt(root, receipt)

  installHost(getHost('claude'), { root, sourceRoot })

  assert.equal(existsSync(join(root, retired)), false, 'the retired hook script is removed as a pristine orphan')
  assert.equal(
    readFileSync(settingsPath, 'utf8').includes('retired-start'),
    false,
    'no settings entry dangles toward the removed script'
  )
  const nextMerge = loadReceipt(root).merges.find((entry) => entry.path === '.claude/settings.json')
  assert.equal(nextMerge.fragments.includes(retired), false, 'the stale fragment leaves the receipt')
})

test('reinstall regenerates a locally modified installed file and reports it', () => {
  const root = tempRoot('modified')
  const skillPath = join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')

  installHost(getHost('claude'), { root, sourceRoot })
  writeFileSync(skillPath, '# locally edited\n', 'utf8')

  const result = installHost(getHost('claude'), { root, sourceRoot })

  assert.notEqual(readFileSync(skillPath, 'utf8'), '# locally edited\n', 'installed copies are regenerated, not merged')
  assert.ok(
    result.warnings.some((warning) => warning.code === 'overwrote_modified_file' && warning.message.includes('.claude/skills/auto-frame/SKILL.md')),
    'the regeneration is reported'
  )
})

test('codex uninstall strips exactly the feature lines automaton added', () => {
  // User already enabled multi_agent before install: automaton only added
  // hooks, so uninstall removes only hooks. The pre-receipt code could not
  // know this and blanket-preserved multi_agent on every uninstall.
  const ownedRoot = tempRoot('codex-owned')
  const ownedConfig = join(ownedRoot, '.codex', 'config.toml')
  mkdirSync(join(ownedRoot, '.codex'), { recursive: true })
  writeFileSync(ownedConfig, '[features]\nmulti_agent = true\n', 'utf8')

  installHost(getHost('codex'), { root: ownedRoot, sourceRoot })
  uninstallHost(getHost('codex'), { root: ownedRoot, sourceRoot })

  assert.equal(readFileSync(ownedConfig, 'utf8'), '[features]\nmulti_agent = true\n')

  // Automaton created the config from scratch: uninstall takes the whole file
  // (and the now-empty .codex directory) back out.
  const freshRoot = tempRoot('codex-fresh')
  installHost(getHost('codex'), { root: freshRoot, sourceRoot })
  uninstallHost(getHost('codex'), { root: freshRoot, sourceRoot })

  assert.equal(existsSync(join(freshRoot, '.codex')), false, 'an automaton-created .codex leaves with the harness')
})

test('a user-owned modern hooks line survives the legacy migration and uninstall', () => {
  // The user had BOTH the legacy spelling and the modern line. Install
  // migrates the legacy duplicate away, but the modern line was the user's
  // before automaton arrived and must never be claimed or stripped.
  const root = tempRoot('codex-both-spellings')
  const config = join(root, '.codex', 'config.toml')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(config, '[features]\ncodex_hooks = true\nhooks = true\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })

  const merge = loadReceipt(root).merges.find((entry) => entry.path === '.codex/config.toml')
  assert.equal(merge.addedLines.includes('hooks = true'), false, 'the user-owned modern line is not claimed')
  assert.ok(merge.addedLines.includes('multi_agent = true'), 'the line automaton actually added is claimed')

  uninstallHost(getHost('codex'), { root, sourceRoot })

  assert.equal(readFileSync(config, 'utf8'), '[features]\nhooks = true\n', 'the user keeps hook enablement after uninstall')
})

test('reinstall carries forward provenance: created dirs and pristine steering baselines survive', () => {
  const root = tempRoot('carry')

  installHost(getHost('claude'), { root, sourceRoot })
  installHost(getHost('claude'), { root, sourceRoot })

  const receipt = loadReceipt(root)
  const created = new Set(receipt.createdDirs.map((entry) => entry.path))
  assert.ok(created.has('.claude'), 'first-install dir provenance survives the reinstall')
  assert.ok(created.has('.agent'), 'scaffold dir provenance survives the reinstall')
  assert.ok(
    receipt.files.some((entry) => entry.path === '.agent/steering/ROADMAP.md'),
    'steering keeps its install-time hash entry even though the reinstall did not rewrite it'
  )
  assert.ok(
    receipt.merges.some((entry) => entry.path === '.claude/settings.json' && entry.fragments.length > 0),
    'merge ownership survives the reinstall even though nothing changed'
  )
})

test('legacy installs without a receipt still uninstall through source recompute', () => {
  const root = tempRoot('legacy')

  installHost(getHost('claude'), { root, sourceRoot })
  rmSync(receiptPath(root), { force: true })

  uninstallHost(getHost('claude'), { root, sourceRoot })
  uninstallProject(root)

  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame')), false)
  assert.equal(existsSync(join(root, '.claude', 'agents', 'automaton-implementer.md')), false)
  assert.equal(existsSync(join(root, '.agent', '.automaton')), false)
  // Pre-receipt behavior is intentionally conservative: steering and the
  // host folder stay because provenance is unknown.
  assert.equal(existsSync(join(root, '.agent', 'steering', 'ROADMAP.md')), true)
  assert.equal(existsSync(join(root, '.claude')), true)
})
