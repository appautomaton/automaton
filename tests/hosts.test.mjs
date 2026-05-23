import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { installHost, uninstallHost } from '../lib/install.mjs'
import { saveStatusSummary } from '../lib/status.mjs'
import { HOSTS, detectHosts, getHost } from '../hosts/index.mjs'

const sourceRoot = fileURLToPath(new URL('..', import.meta.url))

test('host registry exposes claude, codex, and opencode stubs', () => {
  assert.deepEqual(HOSTS.map((host) => host.id), ['claude', 'codex', 'opencode'])
})

test('detectHosts identifies a Claude-style workspace', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-hosts-'))
  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(join(root, 'CLAUDE.md'), '# CLAUDE\n', 'utf8')

  assert.deepEqual(detectHosts(root).map((host) => host.id), ['claude'])
})

test('detectHosts identifies a Codex-style workspace via .codex', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-hosts-'))
  mkdirSync(join(root, '.codex'), { recursive: true })

  assert.deepEqual(detectHosts(root).map((host) => host.id), ['codex'])
})

test('detectHosts does not identify a Codex-style workspace from AGENTS.md alone', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-hosts-'))
  writeFileSync(join(root, 'AGENTS.md'), '# AGENTS\n', 'utf8')

  assert.deepEqual(detectHosts(root).map((host) => host.id), [])
})

test('detectHosts identifies an OpenCode-style workspace via .opencode', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-hosts-'))
  mkdirSync(join(root, '.opencode'), { recursive: true })

  assert.deepEqual(detectHosts(root).map((host) => host.id), ['opencode'])
})

test('detectHosts identifies an OpenCode-style workspace via opencode.json', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-hosts-'))
  writeFileSync(join(root, 'opencode.json'), '{}\n', 'utf8')

  assert.deepEqual(detectHosts(root).map((host) => host.id), ['opencode'])
})

test('getHost resolves known hosts and rejects unknown ones', () => {
  assert.equal(getHost('codex').id, 'codex')
  assert.throws(() => getHost('unknown'), /unknown host: unknown/)
})

test('Claude install scaffolds .agent and the Claude skills surface', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-'))

  const result = installHost(getHost('claude'), { root, sourceRoot })
  const settings = JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'))

  assert.equal(result.id, 'claude')
  assert.equal(existsSync(join(root, '.agent', 'steering', 'PROJECT.md')), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'state', 'current.json')), true)
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-execute', 'SKILL.md')), true)
  assert.match(readFileSync(join(root, '.claude', 'skills', 'auto-execute', 'references', 'HOST-TOOLS.md'), 'utf8'), /Agent tool/)
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-onboard', 'templates', 'PROJECT.md')), true)
  assert.deepEqual(Object.keys(settings.hooks), ['SessionStart', 'Stop'])
  assert.equal(existsSync(join(root, '.claude', 'hooks', 'session-start.mjs')), true)
  assert.equal(existsSync(join(root, '.claude', 'hooks', 'stop.mjs')), true)
})

test('reinstalling Claude refreshes manifest-owned hooks and skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-claude-'))
  const host = getHost('claude')
  const hookTarget = join(root, '.claude', 'hooks', 'stop.mjs')
  const skillTarget = join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')

  installHost(host, { root, sourceRoot })
  writeFileSync(hookTarget, '// stale claude hook\n', 'utf8')
  writeFileSync(skillTarget, '# stale claude skill\n', 'utf8')

  installHost(host, { root, sourceRoot })

  assert.equal(readFileSync(hookTarget, 'utf8'), host.installFiles({ root })['.claude/hooks/stop.mjs'])
  assert.equal(readFileSync(skillTarget, 'utf8'), readFileSync(join(sourceRoot, 'skills', 'auto-frame', 'SKILL.md'), 'utf8'))
})

test('Claude session-start hook reads Automaton state from a nested working directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-hook-'))
  const nested = join(root, 'src', 'nested')
  const scriptTarget = join(root, '.claude', 'hooks', 'session-start.mjs')

  installHost(getHost('claude'), { root, sourceRoot })
  mkdirSync(nested, { recursive: true })

  const result = spawnSync(process.execPath, [scriptTarget], {
    cwd: nested,
    encoding: 'utf8'
  })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  const payload = JSON.parse(result.stdout)
  assert.match(payload.hookSpecificOutput.additionalContext, /Automaton: change=bootstrap; stage=frame\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /Read \.agent\/steering\/STATUS\.md and \.agent\/work\/bootstrap\//)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /<change>/)
})

test('Claude session-start hook injects canonical artifacts and current progress', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-context-'))
  const scriptTarget = join(root, '.claude', 'hooks', 'session-start.mjs')
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')

  installHost(getHost('claude'), { root, sourceRoot })
  writeFileSync(
    currentTarget,
    '{\n  "active_change": "deepen-skills",\n  "stage": "plan",\n  "canonical_spec": "automaton/.agent/work/deepen-skills/SPEC.md",\n  "canonical_plan": "automaton/.agent/work/deepen-skills/PLAN.md"\n}\n',
    'utf8'
  )
  saveStatusSummary(join(root, '.agent', 'steering', 'STATUS.md'), {
    activeChange: 'deepen-skills',
    stage: 'plan',
    whatIsTrueNow: ['Slice 1 shared references are complete.'],
    nextStep: 'Execute Slice 2: deepen auto-onboard.',
    openRisks: ['auto-frame was rewritten ahead of dependency order.']
  })

  const result = spawnSync(process.execPath, [scriptTarget], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  const payload = JSON.parse(result.stdout)
  assert.match(payload.hookSpecificOutput.additionalContext, /Automaton: change=deepen-skills; stage=plan\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /automaton\/\.agent\/work\/deepen-skills\/\{SPEC\.md, PLAN\.md\}/)
  assert.match(payload.hookSpecificOutput.additionalContext, /Progress: Slice 1 shared references are complete\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /Next: Execute Slice 2: deepen auto-onboard\./)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /<change>/)
})

test('Claude stop hook initializes STATUS.md from current state', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-stop-'))
  const scriptTarget = join(root, '.claude', 'hooks', 'stop.mjs')
  const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')

  installHost(getHost('claude'), { root, sourceRoot })

  const result = spawnSync(process.execPath, [scriptTarget], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, '')
  assert.equal(
    readFileSync(statusTarget, 'utf8'),
    '# Status\n\n## Current Change\n\n- active change: `bootstrap`\n- current stage: `frame`\n\n## What Is True Now\n\n- none recorded\n\n## Next Step\n\nRun `auto-onboard` to refresh project truth for the repository before continuing.\n\n## Open Risks\n\n- none recorded\n'
  )
})

test('Claude install preserves existing settings while adding Automaton hooks', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-settings-'))
  const settingsTarget = join(root, '.claude', 'settings.json')
  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(settingsTarget, '{\n  "env": {\n    "FOO": "bar"\n  }\n}\n', 'utf8')

  installHost(getHost('claude'), { root, sourceRoot })

  const settings = JSON.parse(readFileSync(settingsTarget, 'utf8'))

  assert.equal(settings.env.FOO, 'bar')
  assert.deepEqual(Object.keys(settings.hooks), ['SessionStart', 'Stop'])
})

test('Claude uninstall preserves unrelated settings while removing Automaton hooks', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-claude-settings-'))
  const settingsTarget = join(root, '.claude', 'settings.json')
  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(settingsTarget, '{\n  "env": {\n    "FOO": "bar"\n  }\n}\n', 'utf8')

  installHost(getHost('claude'), { root, sourceRoot })
  uninstallHost(getHost('claude'), { root, sourceRoot })

  assert.equal(readFileSync(settingsTarget, 'utf8'), '{\n  "env": {\n    "FOO": "bar"\n  }\n}\n')
  assert.equal(existsSync(join(root, '.claude', 'hooks', 'session-start.mjs')), false)
})

test('Codex install scaffolds config, hooks, and skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-'))

  const result = installHost(getHost('codex'), { root, sourceRoot })
  const hooks = JSON.parse(readFileSync(join(root, '.codex', 'hooks.json'), 'utf8'))

  assert.equal(result.id, 'codex')
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-execute', 'SKILL.md')), true)
  assert.equal(readFileSync(join(root, '.codex', 'config.toml'), 'utf8'), '[features]\nhooks = true\nmulti_agent = true\n')
  const hostTools = readFileSync(join(root, '.codex', 'skills', 'auto-execute', 'references', 'HOST-TOOLS.md'), 'utf8')
  assert.match(hostTools, /spawn_agent/)
  assert.match(hostTools, /custom agent defined as TOML/)
  assert.deepEqual(Object.keys(hooks.hooks), ['SessionStart', 'Stop'])
  assert.match(hooks.hooks.SessionStart[0].hooks[0].command, /git rev-parse --show-toplevel/)
  assert.equal(existsSync(join(root, '.codex', 'hooks', 'session-start.mjs')), true)
  assert.equal(existsSync(join(root, '.codex', 'hooks', 'stop.mjs')), true)
})

test('reinstalling Codex refreshes manifest-owned hooks and skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-codex-'))
  const host = getHost('codex')
  const hookTarget = join(root, '.codex', 'hooks', 'stop.mjs')
  const skillTarget = join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')

  installHost(host, { root, sourceRoot })
  writeFileSync(hookTarget, '// stale codex hook\n', 'utf8')
  writeFileSync(skillTarget, '# stale codex skill\n', 'utf8')

  installHost(host, { root, sourceRoot })

  assert.equal(readFileSync(hookTarget, 'utf8'), host.installFiles({ root })['.codex/hooks/stop.mjs'])
  assert.equal(readFileSync(skillTarget, 'utf8'), readFileSync(join(sourceRoot, 'skills', 'auto-frame', 'SKILL.md'), 'utf8'))
})

test('reinstalling Codex refreshes manifest-owned injected shared artifacts', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-codex-shared-'))
  const host = getHost('codex')
  const referenceTarget = join(root, '.agent', '.automaton', 'references', 'CONTEXT-BUDGET.md')
  const legacyReferenceTarget = join(root, '.codex', 'skills', 'auto-frame', 'references', 'CONTEXT-BUDGET.md')
  const scriptTarget = join(root, '.codex', 'skills', 'auto-frame', 'scripts', 'get-context.mjs')
  const hostToolsTarget = join(root, '.codex', 'skills', 'auto-execute', 'references', 'HOST-TOOLS.md')

  installHost(host, { root, sourceRoot })
  writeFileSync(referenceTarget, '# stale shared reference\n', 'utf8')
  writeFileSync(scriptTarget, '// stale shared script\n', 'utf8')
  writeFileSync(hostToolsTarget, '# stale host tools\n', 'utf8')

  installHost(host, { root, sourceRoot })

  assert.equal(readFileSync(referenceTarget, 'utf8'), readFileSync(join(sourceRoot, 'skills', '_shared', 'references', 'CONTEXT-BUDGET.md'), 'utf8'))
  assert.equal(existsSync(legacyReferenceTarget), false)
  assert.equal(readFileSync(scriptTarget, 'utf8'), readFileSync(join(sourceRoot, 'skills', '_shared', 'scripts', 'get-context.mjs'), 'utf8'))
  assert.match(readFileSync(hostToolsTarget, 'utf8'), /spawn_agent/)
  assert.doesNotMatch(readFileSync(hostToolsTarget, 'utf8'), /stale host tools/)
})

test('Codex session-start hook reads Automaton state from a nested working directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-hook-'))
  const nested = join(root, 'src', 'nested')
  const scriptTarget = join(root, '.codex', 'hooks', 'session-start.mjs')

  installHost(getHost('codex'), { root, sourceRoot })
  mkdirSync(nested, { recursive: true })

  const result = spawnSync(process.execPath, [scriptTarget], {
    cwd: nested,
    encoding: 'utf8'
  })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  const payload = JSON.parse(result.stdout)
  assert.match(payload.hookSpecificOutput.additionalContext, /Automaton: change=bootstrap; stage=frame\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /Read \.agent\/steering\/STATUS\.md and \.agent\/work\/bootstrap\//)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /<change>/)
})

test('Codex session-start hook injects canonical artifacts and current progress', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-context-'))
  const scriptTarget = join(root, '.codex', 'hooks', 'session-start.mjs')
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')

  installHost(getHost('codex'), { root, sourceRoot })
  writeFileSync(
    currentTarget,
    '{\n  "active_change": "deepen-skills",\n  "stage": "plan",\n  "canonical_spec": "automaton/.agent/work/deepen-skills/SPEC.md",\n  "canonical_plan": "automaton/.agent/work/deepen-skills/PLAN.md"\n}\n',
    'utf8'
  )
  saveStatusSummary(join(root, '.agent', 'steering', 'STATUS.md'), {
    activeChange: 'deepen-skills',
    stage: 'plan',
    whatIsTrueNow: ['Slice 1 shared references are complete.'],
    nextStep: 'Execute Slice 2: deepen auto-onboard.',
    openRisks: ['auto-frame was rewritten ahead of dependency order.']
  })

  const result = spawnSync(process.execPath, [scriptTarget], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  const payload = JSON.parse(result.stdout)
  assert.match(payload.hookSpecificOutput.additionalContext, /Automaton: change=deepen-skills; stage=plan\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /automaton\/\.agent\/work\/deepen-skills\/\{SPEC\.md, PLAN\.md\}/)
  assert.match(payload.hookSpecificOutput.additionalContext, /Progress: Slice 1 shared references are complete\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /Next: Execute Slice 2: deepen auto-onboard\./)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /<change>/)
})

test('Codex stop hook updates stale STATUS.md pointers while preserving summary sections', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-stop-'))
  const scriptTarget = join(root, '.codex', 'hooks', 'stop.mjs')
  const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')

  installHost(getHost('codex'), { root, sourceRoot })
  saveStatusSummary(statusTarget, {
    activeChange: 'stale-change',
    stage: 'plan',
    whatIsTrueNow: ['A stale status summary survived the previous session.'],
    nextStep: 'Refresh the controller-owned summary after verification.',
    openRisks: ['Resume could follow the wrong active change.']
  })

  const result = spawnSync(process.execPath, [scriptTarget], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, '')
  assert.equal(
    readFileSync(statusTarget, 'utf8'),
    '# Status\n\n## Current Change\n\n- active change: `bootstrap`\n- current stage: `frame`\n\n## What Is True Now\n\n- A stale status summary survived the previous session.\n\n## Next Step\n\nRefresh the controller-owned summary after verification.\n\n## Open Risks\n\n- Resume could follow the wrong active change.\n'
  )
})

test('Codex install migrates manifest-owned legacy stage skill names within .codex skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-migrate-'))
  const legacySkillTarget = join(root, '.codex', 'skills', 'frame', 'SKILL.md')
  const manifestTarget = join(root, '.agent', '.automaton', 'state', 'install-manifest.json')

  mkdirSync(join(root, '.codex', 'skills', 'frame'), { recursive: true })
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(legacySkillTarget, '# legacy automaton frame\n', 'utf8')
  writeFileSync(
    manifestTarget,
    '{\n  "project": {\n    "files": []\n  },\n  "hosts": {\n    "codex": {\n      "files": [\n        ".codex/skills/frame/SKILL.md"\n      ],\n      "mutations": {\n        "codexHooksInjected": false\n      }\n    }\n  }\n}\n',
    'utf8'
  )

  installHost(getHost('codex'), { root, sourceRoot })

  assert.equal(existsSync(legacySkillTarget), false)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(readFileSync(manifestTarget, 'utf8').includes('.codex/skills/frame/SKILL.md'), false)
})

test('Codex install removes manifest-owned .agents skill copies while using .codex skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-agents-migrate-'))
  const legacySkillTarget = join(root, '.agents', 'skills', 'auto-frame', 'SKILL.md')
  const manifestTarget = join(root, '.agent', '.automaton', 'state', 'install-manifest.json')

  mkdirSync(join(root, '.agents', 'skills', 'auto-frame'), { recursive: true })
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(legacySkillTarget, '# accidental .agents skill\n', 'utf8')
  writeFileSync(
    manifestTarget,
    '{\n  "project": {\n    "files": []\n  },\n  "hosts": {\n    "codex": {\n      "files": [\n        ".agents/skills/auto-frame/SKILL.md"\n      ],\n      "mutations": {\n        "codexHooksInjected": false\n      }\n    }\n  }\n}\n',
    'utf8'
  )

  installHost(getHost('codex'), { root, sourceRoot })

  assert.equal(existsSync(legacySkillTarget), false)
  assert.equal(existsSync(join(root, '.agents')), false)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(readFileSync(manifestTarget, 'utf8').includes('.agents/skills/auto-frame/SKILL.md'), false)
})

test('host install removes manifest-owned removed skill folders', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-removed-skill-'))
  const removedSkillTarget = join(root, '.codex', 'skills', 'auto-execute-subagent', 'SKILL.md')
  const manifestTarget = join(root, '.agent', '.automaton', 'state', 'install-manifest.json')

  mkdirSync(join(root, '.codex', 'skills', 'auto-execute-subagent'), { recursive: true })
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(removedSkillTarget, '# stale removed skill\n', 'utf8')
  writeFileSync(
    manifestTarget,
    '{\n  "project": {\n    "files": []\n  },\n  "hosts": {\n    "codex": {\n      "files": [\n        ".codex/skills/auto-execute-subagent/SKILL.md"\n      ],\n      "mutations": {\n        "codexHooksInjected": false\n      }\n    }\n  }\n}\n',
    'utf8'
  )

  installHost(getHost('codex'), { root, sourceRoot })

  assert.equal(existsSync(removedSkillTarget), false)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-execute-subagent')), false)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-execute', 'SKILL.md')), true)
  assert.equal(readFileSync(manifestTarget, 'utf8').includes('.codex/skills/auto-execute-subagent/SKILL.md'), false)
})

test('host install migrates manifest-owned legacy skill names within the current host root', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-rename-'))
  const legacySkillTarget = join(root, '.claude', 'skills', 'frame', 'SKILL.md')
  const manifestTarget = join(root, '.agent', '.automaton', 'state', 'install-manifest.json')

  mkdirSync(join(root, '.claude', 'skills', 'frame'), { recursive: true })
  mkdirSync(join(root, '.agent', '.automaton', 'state'), { recursive: true })
  writeFileSync(legacySkillTarget, '# legacy automaton frame\n', 'utf8')
  writeFileSync(
    manifestTarget,
    '{\n  "project": {\n    "files": []\n  },\n  "hosts": {\n    "claude": {\n      "files": [\n        ".claude/skills/frame/SKILL.md"\n      ],\n      "mutations": {\n        "codexHooksInjected": false,\n        "claudeHooksInjected": false\n      }\n    }\n  }\n}\n',
    'utf8'
  )

  installHost(getHost('claude'), { root, sourceRoot })

  assert.equal(existsSync(legacySkillTarget), false)
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')), true)
})

test('Codex install preserves existing config while ensuring codex hooks are enabled', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-config-'))
  const configTarget = join(root, '.codex', 'config.toml')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(configTarget, 'model = "gpt-5.4"\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })

  assert.equal(readFileSync(configTarget, 'utf8'), 'model = "gpt-5.4"\n\n[features]\nhooks = true\nmulti_agent = true\n')
})

test('Codex install preserves existing multi_agent while adding missing hooks', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-multi-agent-'))
  const configTarget = join(root, '.codex', 'config.toml')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(configTarget, '[features]\nmulti_agent = true\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })

  assert.equal(readFileSync(configTarget, 'utf8'), '[features]\nhooks = true\nmulti_agent = true\n')
})

test('Codex install migrates deprecated codex_hooks feature flag', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-hooks-migrate-'))
  const configTarget = join(root, '.codex', 'config.toml')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(configTarget, '[features]\ncodex_hooks = true\nmulti_agent = true\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })

  assert.equal(readFileSync(configTarget, 'utf8'), '[features]\nhooks = true\nmulti_agent = true\n')
})

test('Codex uninstall removes Automaton hooks and skills while preserving .agent', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-'))

  installHost(getHost('codex'), { root, sourceRoot })

  const result = uninstallHost(getHost('codex'), { root, sourceRoot })

  assert.equal(result.id, 'codex')
  assert.equal(existsSync(join(root, '.agent', 'steering', 'PROJECT.md')), true)
  assert.equal(existsSync(join(root, '.codex')), true)
  assert.equal(existsSync(join(root, '.agents')), false)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), false)
  assert.equal(existsSync(join(root, '.codex', 'hooks.json')), false)
  assert.equal(existsSync(join(root, '.codex', 'hooks', 'session-start.mjs')), false)
  assert.equal(existsSync(join(root, '.codex', 'config.toml')), false)
})

test('Codex uninstall preserves unrelated config while removing the Automaton feature flag', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-config-'))
  const configTarget = join(root, '.codex', 'config.toml')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(configTarget, 'model = "gpt-5.4"\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })
  uninstallHost(getHost('codex'), { root, sourceRoot })

  assert.equal(readFileSync(configTarget, 'utf8'), 'model = "gpt-5.4"\n')
})

test('Codex uninstall preserves user-owned files that predated the install', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-owned-'))
  const skillTarget = join(root, '.codex', 'skills', 'frame', 'SKILL.md')
  const hooksTarget = join(root, '.codex', 'hooks.json')

  mkdirSync(join(root, '.codex', 'skills', 'frame'), { recursive: true })
  writeFileSync(skillTarget, '# user frame\n', 'utf8')
  writeFileSync(hooksTarget, '{"hooks":{}}\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })
  uninstallHost(getHost('codex'), { root, sourceRoot })

  assert.equal(readFileSync(skillTarget, 'utf8'), '# user frame\n')
  assert.equal(readFileSync(hooksTarget, 'utf8'), '{"hooks":{}}\n')
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')), false)
})

test('Codex uninstall preserves user-owned multi_agent feature flag', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-owned-multi-agent-'))
  const configTarget = join(root, '.codex', 'config.toml')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(configTarget, '[features]\nmulti_agent = true\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })
  uninstallHost(getHost('codex'), { root, sourceRoot })

  assert.equal(readFileSync(configTarget, 'utf8'), '[features]\nmulti_agent = true\n')
})

test('OpenCode install scaffolds the OpenCode skills surface', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-opencode-'))

  const result = installHost(getHost('opencode'), { root, sourceRoot })
  const pluginSource = readFileSync(join(root, '.opencode', 'plugins', 'automaton.js'), 'utf8')

  assert.equal(result.id, 'opencode')
  assert.equal(existsSync(join(root, '.opencode', 'skills', 'auto-frame', 'SKILL.md')), true)
  assert.equal(existsSync(join(root, '.opencode', 'skills', 'auto-execute', 'SKILL.md')), true)
  assert.match(readFileSync(join(root, '.opencode', 'skills', 'auto-execute', 'references', 'HOST-TOOLS.md'), 'utf8'), /@mention/)
  assert.equal(existsSync(join(root, '.opencode', 'plugins', 'automaton.js')), true)
  assert.match(pluginSource, /session\.idle/)
  assert.doesNotMatch(pluginSource, /showToast/)
})

test('reinstalling OpenCode refreshes manifest-owned plugin and skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-opencode-'))
  const host = getHost('opencode')
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')
  const skillTarget = join(root, '.opencode', 'skills', 'auto-frame', 'SKILL.md')

  installHost(host, { root, sourceRoot })
  writeFileSync(pluginTarget, '// stale opencode plugin\n', 'utf8')
  writeFileSync(skillTarget, '# stale opencode skill\n', 'utf8')

  installHost(host, { root, sourceRoot })

  assert.equal(readFileSync(pluginTarget, 'utf8'), host.installFiles({ root })['.opencode/plugins/automaton.js'])
  assert.equal(readFileSync(skillTarget, 'utf8'), readFileSync(join(sourceRoot, 'skills', 'auto-frame', 'SKILL.md'), 'utf8'))
})

test('reinstalling OpenCode preserves a preexisting user-owned plugin file', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-opencode-user-owned-'))
  const host = getHost('opencode')
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')

  mkdirSync(join(root, '.opencode', 'plugins'), { recursive: true })
  writeFileSync(pluginTarget, '// user-owned plugin\n', 'utf8')

  installHost(host, { root, sourceRoot })
  installHost(host, { root, sourceRoot })

  assert.equal(readFileSync(pluginTarget, 'utf8'), '// user-owned plugin\n')
})

test('OpenCode plugin syncs STATUS.md pointers on session.idle without user-facing toast', async () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-opencode-idle-'))
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')
  const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')

  installHost(getHost('opencode'), { root, sourceRoot })
  saveStatusSummary(statusTarget, {
    activeChange: 'stale-change',
    stage: 'execute',
    whatIsTrueNow: ['OpenCode still has stale status pointers.'],
    nextStep: 'Refresh the project truth after the idle hook runs.',
    openRisks: ['Idle reminders can lag behind the actual current state.']
  })

  const { AutomatonPlugin } = await import(pathToFileURL(pluginTarget).href)
  const plugin = await AutomatonPlugin({
    client: {
      session: {
        prompt() {
          return Promise.resolve()
        }
      }
    },
    directory: root,
    worktree: root
  })

  await plugin.event({ event: { type: 'session.idle', properties: {} } })

  assert.equal(
    readFileSync(statusTarget, 'utf8'),
    '# Status\n\n## Current Change\n\n- active change: `bootstrap`\n- current stage: `frame`\n\n## What Is True Now\n\n- OpenCode still has stale status pointers.\n\n## Next Step\n\nRefresh the project truth after the idle hook runs.\n\n## Open Risks\n\n- Idle reminders can lag behind the actual current state.\n'
  )
})

test('OpenCode plugin syncs STATUS.md on session.idle', async () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-opencode-idle-'))
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')
  const statusTarget = join(root, '.agent', 'steering', 'STATUS.md')

  installHost(getHost('opencode'), { root, sourceRoot })
  writeFileSync(
    currentTarget,
    '{\n  "active_change": "deepen-skills",\n  "stage": "plan"\n}\n',
    'utf8'
  )
  writeFileSync(statusTarget, '# Status\n\nOld content.\n', 'utf8')

  const { AutomatonPlugin } = await import(pathToFileURL(pluginTarget).href)
  const plugin = await AutomatonPlugin({
    client: { session: { prompt() { return Promise.resolve() } } },
    directory: root,
    worktree: root
  })

  await plugin.event({ event: { type: 'session.idle', properties: {} } })

  assert.match(readFileSync(statusTarget, 'utf8'), /active change: `deepen-skills`/)
  assert.match(readFileSync(statusTarget, 'utf8'), /current stage: `plan`/)
})

test('Claude SessionStart matcher fires on startup, resume, clear, and compact', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-claude-matcher-'))

  installHost(getHost('claude'), { root, sourceRoot })

  const settings = JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'))
  assert.equal(settings.hooks.SessionStart[0].matcher, 'startup|resume|clear|compact')
})

test('Codex SessionStart matcher fires on startup, resume, clear (and not compact)', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-codex-matcher-'))

  installHost(getHost('codex'), { root, sourceRoot })

  const hooks = JSON.parse(readFileSync(join(root, '.codex', 'hooks.json'), 'utf8'))
  assert.equal(hooks.hooks.SessionStart[0].matcher, 'startup|resume|clear')
  assert.doesNotMatch(hooks.hooks.SessionStart[0].matcher, /compact/)
})

test('OpenCode plugin injects session context, dedups, and re-injects after compaction', async () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-opencode-transform-'))
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')

  installHost(getHost('opencode'), { root, sourceRoot })
  writeFileSync(
    currentTarget,
    '{\n  "active_change": "deepen-skills",\n  "stage": "plan"\n}\n',
    'utf8'
  )

  const { AutomatonPlugin } = await import(pathToFileURL(pluginTarget).href)
  const plugin = await AutomatonPlugin({
    client: { session: { prompt() { return Promise.resolve() } } },
    directory: root,
    worktree: root
  })

  // Behavior 1: first transform prepends an "Automaton:" text part to the first user message.
  const output1 = { messages: [{ info: { role: 'user' }, parts: [{ type: 'text', text: 'hi' }] }] }
  await plugin['experimental.chat.messages.transform']({}, output1)
  assert.equal(output1.messages[0].parts.length, 2)
  assert.match(output1.messages[0].parts[0].text, /^Automaton: change=deepen-skills; stage=plan\./)
  assert.equal(output1.messages[0].parts[1].text, 'hi')

  // Behavior 2: re-running the transform on the same output does NOT double-inject.
  await plugin['experimental.chat.messages.transform']({}, output1)
  assert.equal(output1.messages[0].parts.length, 2)

  // Behavior 3: session.compacted sets the flag; the next transform uses the compacted variant.
  await plugin.event({ event: { type: 'session.compacted', properties: {} } })
  const output2 = { messages: [{ info: { role: 'user' }, parts: [{ type: 'text', text: 'hi' }] }] }
  await plugin['experimental.chat.messages.transform']({}, output2)
  assert.match(output2.messages[0].parts[0].text, /Context compacted/)

  // Behavior 4: the compacted flag is one-shot — subsequent transforms revert to the default variant.
  const output3 = { messages: [{ info: { role: 'user' }, parts: [{ type: 'text', text: 'hi' }] }] }
  await plugin['experimental.chat.messages.transform']({}, output3)
  assert.match(output3.messages[0].parts[0].text, /^Automaton:/)
  assert.doesNotMatch(output3.messages[0].parts[0].text, /Context compacted/)
})

test('OpenCode plugin transform is a no-op when no user message is present', async () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-opencode-transform-noop-'))
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')

  installHost(getHost('opencode'), { root, sourceRoot })

  const { AutomatonPlugin } = await import(pathToFileURL(pluginTarget).href)
  const plugin = await AutomatonPlugin({
    client: { session: { prompt() { return Promise.resolve() } } },
    directory: root,
    worktree: root
  })

  const emptyOutput = { messages: [] }
  await plugin['experimental.chat.messages.transform']({}, emptyOutput)
  assert.deepEqual(emptyOutput.messages, [])

  const assistantOnly = { messages: [{ info: { role: 'assistant' }, parts: [{ type: 'text', text: 'reply' }] }] }
  await plugin['experimental.chat.messages.transform']({}, assistantOnly)
  assert.equal(assistantOnly.messages[0].parts.length, 1)
  assert.equal(assistantOnly.messages[0].parts[0].text, 'reply')
})
