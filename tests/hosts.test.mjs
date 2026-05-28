import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { installHost, uninstallHost, SUBAGENT_ROLES } from '../lib/install.mjs'
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
  assert.equal(existsSync(join(root, '.claude', 'skills', 'auto-frame', 'scripts')), false)
  assert.deepEqual(Object.keys(settings.hooks), ['SessionStart'])
  assert.equal(settings.hooks.SessionStart[0].hooks[0].command.includes(process.execPath), true)
  assert.equal(existsSync(join(root, '.claude', 'hooks', 'session-start.mjs')), true)
  assert.equal(existsSync(join(root, '.claude', 'hooks', 'stop.mjs')), false)
})

test('reinstalling Claude refreshes generated hooks and skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-claude-'))
  const host = getHost('claude')
  const hookTarget = join(root, '.claude', 'hooks', 'session-start.mjs')
  const skillTarget = join(root, '.claude', 'skills', 'auto-frame', 'SKILL.md')

  installHost(host, { root, sourceRoot })
  writeFileSync(hookTarget, '// stale claude hook\n', 'utf8')
  writeFileSync(skillTarget, '# stale claude skill\n', 'utf8')

  installHost(host, { root, sourceRoot })

  assert.equal(readFileSync(hookTarget, 'utf8'), host.installFiles({ root })['.claude/hooks/session-start.mjs'])
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
  assert.match(payload.hookSpecificOutput.additionalContext, /^<automaton_reminder> This project has the Automaton stage-gated harness installed\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /State JSON: \.agent\/\.automaton\/state\/current\.json \(change=bootstrap; stage=frame\)\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /Work artifacts, when relevant, live under \.agent\/work\//)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /STATUS\.md|Status summary/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /\.agent\/work\/bootstrap\//)
  assert.match(payload.hookSpecificOutput.additionalContext, /honor the user's latest request/)
  assert.match(payload.hookSpecificOutput.additionalContext, /<\/automaton_reminder>$/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /<change>/)
})

test('Claude session-start hook injects the shared Automaton reminder without status prose', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-context-'))
  const scriptTarget = join(root, '.claude', 'hooks', 'session-start.mjs')
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')

  installHost(getHost('claude'), { root, sourceRoot })
  writeFileSync(
    currentTarget,
    '{\n  "active_change": "deepen-skills",\n  "stage": "plan",\n  "canonical_spec": "automaton/.agent/work/deepen-skills/SPEC.md",\n  "canonical_plan": "automaton/.agent/work/deepen-skills/PLAN.md"\n}\n',
    'utf8'
  )

  const result = spawnSync(process.execPath, [scriptTarget], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  const payload = JSON.parse(result.stdout)
  assert.match(payload.hookSpecificOutput.additionalContext, /State JSON: \.agent\/\.automaton\/state\/current\.json \(change=deepen-skills; stage=plan\)\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /canonical artifact pointers are in current\.json\./)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /STATUS\.md|Status summary/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /Progress:/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /Next:/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /<change>/)
})

test('Claude install preserves existing settings while adding Automaton hooks', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-settings-'))
  const settingsTarget = join(root, '.claude', 'settings.json')
  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(settingsTarget, '{\n  "env": {\n    "FOO": "bar"\n  }\n}\n', 'utf8')

  installHost(getHost('claude'), { root, sourceRoot })

  const settings = JSON.parse(readFileSync(settingsTarget, 'utf8'))

  assert.equal(settings.env.FOO, 'bar')
  assert.deepEqual(Object.keys(settings.hooks), ['SessionStart'])
})

test('Claude reinstall refreshes Automaton settings hooks without duplicating them', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-settings-migrate-'))
  const settingsTarget = join(root, '.claude', 'settings.json')
  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(settingsTarget, JSON.stringify({
    env: { FOO: 'bar' },
    hooks: {
      SessionStart: [
        {
          matcher: 'startup|resume|clear|compact',
          hooks: [
            {
              type: 'command',
              command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/session-start.mjs'
            }
          ]
        }
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/custom-stop.mjs'
            }
          ]
        }
      ]
    }
  }, null, 2) + '\n', 'utf8')

  installHost(getHost('claude'), { root, sourceRoot })

  const settings = JSON.parse(readFileSync(settingsTarget, 'utf8'))

  assert.equal(settings.env.FOO, 'bar')
  assert.deepEqual(Object.keys(settings.hooks), ['SessionStart', 'Stop'])
  assert.equal(settings.hooks.SessionStart.length, 1)
  assert.equal(settings.hooks.SessionStart[0].hooks[0].command.includes(process.execPath), true)
  assert.equal(settings.hooks.Stop[0].hooks[0].command, 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/custom-stop.mjs')
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
  assert.match(hostTools, /named custom agent/, 'Codex HOST-TOOLS dispatch line must point at the named custom agents')
  assert.deepEqual(Object.keys(hooks.hooks), ['SessionStart'])
  assert.doesNotMatch(hooks.hooks.SessionStart[0].hooks[0].command, /sh -lc|git rev-parse --show-toplevel/)
  assert.match(hooks.hooks.SessionStart[0].hooks[0].command, /\.codex\/hooks\/session-start\.mjs/)
  assert.equal(hooks.hooks.SessionStart[0].hooks[0].command.includes(process.execPath), true)
  assert.equal(existsSync(join(root, '.codex', 'skills', 'auto-frame', 'scripts')), false)
  assert.equal(existsSync(join(root, '.codex', 'hooks', 'session-start.mjs')), true)
  assert.equal(existsSync(join(root, '.codex', 'hooks', 'stop.mjs')), false)
})

test('reinstalling Codex refreshes generated hooks and skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-codex-'))
  const host = getHost('codex')
  const hookTarget = join(root, '.codex', 'hooks', 'session-start.mjs')
  const skillTarget = join(root, '.codex', 'skills', 'auto-frame', 'SKILL.md')

  installHost(host, { root, sourceRoot })
  writeFileSync(hookTarget, '// stale codex hook\n', 'utf8')
  writeFileSync(skillTarget, '# stale codex skill\n', 'utf8')

  installHost(host, { root, sourceRoot })

  assert.equal(readFileSync(hookTarget, 'utf8'), host.installFiles({ root })['.codex/hooks/session-start.mjs'])
  assert.equal(readFileSync(skillTarget, 'utf8'), readFileSync(join(sourceRoot, 'skills', 'auto-frame', 'SKILL.md'), 'utf8'))
})

test('Codex install preserves existing hooks.json while adding Automaton hook', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-hooks-merge-'))
  const hooksTarget = join(root, '.codex', 'hooks.json')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(hooksTarget, JSON.stringify({
    metadata: { owner: 'user' },
    hooks: {
      SessionStart: [
        {
          matcher: 'startup',
          hooks: [
            {
              type: 'command',
              command: 'node .codex/hooks/user-start.mjs'
            }
          ]
        }
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: 'node .codex/hooks/user-stop.mjs'
            }
          ]
        }
      ]
    }
  }, null, 2) + '\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })

  const hooks = JSON.parse(readFileSync(hooksTarget, 'utf8'))
  const sessionStartCommands = hooks.hooks.SessionStart.flatMap((group) => group.hooks.map((hook) => hook.command))

  assert.equal(hooks.metadata.owner, 'user')
  assert.equal(hooks.hooks.Stop[0].hooks[0].command, 'node .codex/hooks/user-stop.mjs')
  assert.equal(sessionStartCommands.includes('node .codex/hooks/user-start.mjs'), true)
  assert.equal(sessionStartCommands.some((command) => command.includes('.codex/hooks/session-start.mjs')), true)
})

test('Codex reinstall refreshes Automaton hooks.json entry without duplicating it', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-codex-hooks-merge-'))
  const hooksTarget = join(root, '.codex', 'hooks.json')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(hooksTarget, JSON.stringify({
    hooks: {
      SessionStart: [
        {
          matcher: 'startup|resume|clear',
          hooks: [
            {
              type: 'command',
              command: 'node /old/path/.codex/hooks/session-start.mjs'
            }
          ]
        },
        {
          matcher: 'startup',
          hooks: [
            {
              type: 'command',
              command: 'node .codex/hooks/user-start.mjs'
            }
          ]
        }
      ]
    }
  }, null, 2) + '\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })
  installHost(getHost('codex'), { root, sourceRoot })

  const hooks = JSON.parse(readFileSync(hooksTarget, 'utf8'))
  const sessionStartCommands = hooks.hooks.SessionStart.flatMap((group) => group.hooks.map((hook) => hook.command))
  const automatonCommands = sessionStartCommands.filter((command) => command.includes('.codex/hooks/session-start.mjs'))

  assert.equal(sessionStartCommands.includes('node .codex/hooks/user-start.mjs'), true)
  assert.equal(automatonCommands.length, 1)
  assert.equal(automatonCommands[0].includes(process.execPath), true)
  assert.doesNotMatch(automatonCommands[0], /old\/path/)
})

test('reinstalling Codex refreshes shared runtime artifacts and generated HOST-TOOLS', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-codex-shared-'))
  const host = getHost('codex')
  const referenceTarget = join(root, '.agent', '.automaton', 'references', 'CONTEXT-BUDGET.md')
  const legacyReferenceTarget = join(root, '.codex', 'skills', 'auto-frame', 'references', 'CONTEXT-BUDGET.md')
  const scriptTarget = join(root, '.agent', '.automaton', 'scripts', 'get-context.mjs')
  const legacyScriptTarget = join(root, '.codex', 'skills', 'auto-frame', 'scripts', 'get-context.mjs')
  const hostToolsTarget = join(root, '.codex', 'skills', 'auto-execute', 'references', 'HOST-TOOLS.md')

  installHost(host, { root, sourceRoot })
  writeFileSync(referenceTarget, '# stale shared reference\n', 'utf8')
  writeFileSync(scriptTarget, '// stale shared script\n', 'utf8')
  writeFileSync(hostToolsTarget, '# stale host tools\n', 'utf8')

  installHost(host, { root, sourceRoot })

  assert.equal(readFileSync(referenceTarget, 'utf8'), readFileSync(join(sourceRoot, 'skills', '_shared', 'references', 'CONTEXT-BUDGET.md'), 'utf8'))
  assert.equal(existsSync(legacyReferenceTarget), false)
  assert.equal(existsSync(legacyScriptTarget), false)
  assert.equal(readFileSync(scriptTarget, 'utf8'), readFileSync(join(sourceRoot, 'skills', '_shared', 'scripts', 'get-context.mjs'), 'utf8'))
  assert.match(readFileSync(hostToolsTarget, 'utf8'), /spawn_agent/)
  assert.doesNotMatch(readFileSync(hostToolsTarget, 'utf8'), /stale host tools/)
})

test('reinstalling Codex replaces skill folders and removes stale per-skill files', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-codex-stale-skill-files-'))
  const host = getHost('codex')
  const legacyScriptTarget = join(root, '.codex', 'skills', 'auto-frame', 'scripts', 'get-context.mjs')
  const staleReferenceTarget = join(root, '.codex', 'skills', 'auto-frame', 'references', 'STALE.md')

  installHost(host, { root, sourceRoot })
  mkdirSync(join(root, '.codex', 'skills', 'auto-frame', 'scripts'), { recursive: true })
  mkdirSync(join(root, '.codex', 'skills', 'auto-frame', 'references'), { recursive: true })
  writeFileSync(legacyScriptTarget, '// old per-skill script\n', 'utf8')
  writeFileSync(staleReferenceTarget, '# stale reference\n', 'utf8')

  installHost(host, { root, sourceRoot })

  assert.equal(existsSync(legacyScriptTarget), false)
  assert.equal(existsSync(staleReferenceTarget), false)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'state', 'install-manifest.json')), false)
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
  assert.match(payload.hookSpecificOutput.additionalContext, /^<automaton_reminder> This project has the Automaton stage-gated harness installed\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /State JSON: \.agent\/\.automaton\/state\/current\.json \(change=bootstrap; stage=frame\)\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /Work artifacts, when relevant, live under \.agent\/work\//)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /STATUS\.md|Status summary/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /\.agent\/work\/bootstrap\//)
  assert.match(payload.hookSpecificOutput.additionalContext, /honor the user's latest request/)
  assert.match(payload.hookSpecificOutput.additionalContext, /<\/automaton_reminder>$/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /<change>/)
})

test('Codex session-start hook injects the shared Automaton reminder without status prose', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-context-'))
  const scriptTarget = join(root, '.codex', 'hooks', 'session-start.mjs')
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')

  installHost(getHost('codex'), { root, sourceRoot })
  writeFileSync(
    currentTarget,
    '{\n  "active_change": "deepen-skills",\n  "stage": "plan",\n  "canonical_spec": "automaton/.agent/work/deepen-skills/SPEC.md",\n  "canonical_plan": "automaton/.agent/work/deepen-skills/PLAN.md"\n}\n',
    'utf8'
  )

  const result = spawnSync(process.execPath, [scriptTarget], { encoding: 'utf8' })

  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  const payload = JSON.parse(result.stdout)
  assert.match(payload.hookSpecificOutput.additionalContext, /State JSON: \.agent\/\.automaton\/state\/current\.json \(change=deepen-skills; stage=plan\)\./)
  assert.match(payload.hookSpecificOutput.additionalContext, /canonical artifact pointers are in current\.json\./)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /STATUS\.md|Status summary/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /Progress:/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /Next:/)
  assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /<change>/)
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
  assert.equal(readFileSync(join(root, '.codex', 'config.toml'), 'utf8'), '[features]\nmulti_agent = true\n')
})

test('Codex uninstall preserves unrelated config while removing Automaton hook enablement', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-config-'))
  const configTarget = join(root, '.codex', 'config.toml')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(configTarget, 'model = "gpt-5.4"\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })
  uninstallHost(getHost('codex'), { root, sourceRoot })

  assert.equal(readFileSync(configTarget, 'utf8'), 'model = "gpt-5.4"\n\n[features]\nmulti_agent = true\n')
})

test('Codex uninstall preserves unrelated hooks.json entries', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-hooks-merge-'))
  const hooksTarget = join(root, '.codex', 'hooks.json')
  mkdirSync(join(root, '.codex'), { recursive: true })
  writeFileSync(hooksTarget, JSON.stringify({
    hooks: {
      SessionStart: [
        {
          matcher: 'startup',
          hooks: [
            {
              type: 'command',
              command: 'node .codex/hooks/user-start.mjs'
            }
          ]
        }
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: 'node .codex/hooks/user-stop.mjs'
            }
          ]
        }
      ]
    }
  }, null, 2) + '\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })
  uninstallHost(getHost('codex'), { root, sourceRoot })

  const hooks = JSON.parse(readFileSync(hooksTarget, 'utf8'))
  const sessionStartCommands = hooks.hooks.SessionStart.flatMap((group) => group.hooks.map((hook) => hook.command))

  assert.deepEqual(sessionStartCommands, ['node .codex/hooks/user-start.mjs'])
  assert.equal(hooks.hooks.Stop[0].hooks[0].command, 'node .codex/hooks/user-stop.mjs')
  assert.equal(sessionStartCommands.some((command) => command.includes('.codex/hooks/session-start.mjs')), false)
  assert.equal(existsSync(join(root, '.codex', 'hooks', 'session-start.mjs')), false)
})

test('Codex uninstall preserves unrelated user skill files while hooks.json is generated', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-owned-'))
  const skillTarget = join(root, '.codex', 'skills', 'frame', 'SKILL.md')
  const hooksTarget = join(root, '.codex', 'hooks.json')

  mkdirSync(join(root, '.codex', 'skills', 'frame'), { recursive: true })
  writeFileSync(skillTarget, '# user frame\n', 'utf8')
  writeFileSync(hooksTarget, '{"hooks":{}}\n', 'utf8')

  installHost(getHost('codex'), { root, sourceRoot })
  uninstallHost(getHost('codex'), { root, sourceRoot })

  assert.equal(readFileSync(skillTarget, 'utf8'), '# user frame\n')
  assert.equal(existsSync(hooksTarget), false)
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
  assert.equal(existsSync(join(root, '.opencode', 'skills', 'auto-frame', 'scripts')), false)
  assert.equal(existsSync(join(root, '.opencode', 'plugins', 'automaton.js')), true)
  assert.match(pluginSource, /session\.compacted/)
  assert.match(pluginSource, /noReply: true/)
  assert.match(pluginSource, /chat\.message/)
  assert.doesNotMatch(pluginSource, /session\.idle/)
  assert.doesNotMatch(pluginSource, /showToast/)
})

test('reinstalling OpenCode refreshes generated plugin and skills', () => {
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

test('reinstalling OpenCode replaces the generated plugin file', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-opencode-plugin-'))
  const host = getHost('opencode')
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')

  mkdirSync(join(root, '.opencode', 'plugins'), { recursive: true })
  writeFileSync(pluginTarget, '// stale plugin\n', 'utf8')

  installHost(host, { root, sourceRoot })
  installHost(host, { root, sourceRoot })

  assert.equal(readFileSync(pluginTarget, 'utf8'), host.installFiles({ root })['.opencode/plugins/automaton.js'])
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

  // Behavior 1: first transform prepends the Automaton reminder to the first user message.
  const output1 = { messages: [{ info: { role: 'user' }, parts: [{ type: 'text', text: 'hi' }] }] }
  await plugin['experimental.chat.messages.transform']({}, output1)
  assert.equal(output1.messages[0].parts.length, 2)
  assert.match(output1.messages[0].parts[0].text, /^<automaton_reminder> This project has the Automaton stage-gated harness installed\./)
  assert.match(output1.messages[0].parts[0].text, /State JSON: \.agent\/\.automaton\/state\/current\.json \(change=deepen-skills; stage=plan\)\./)
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
  assert.match(output3.messages[0].parts[0].text, /^<automaton_reminder>/)
  assert.doesNotMatch(output3.messages[0].parts[0].text, /Context compacted/)
})

test('OpenCode plugin persists session context with noReply and dedups existing context', async () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-opencode-persist-'))
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')
  const currentTarget = join(root, '.agent', '.automaton', 'state', 'current.json')
  const promptCalls = []
  let sessionMessages = []

  installHost(getHost('opencode'), { root, sourceRoot })
  writeFileSync(
    currentTarget,
    '{\n  "active_change": "persist-opencode",\n  "stage": "frame"\n}\n',
    'utf8'
  )

  const { AutomatonPlugin } = await import(pathToFileURL(pluginTarget).href)
  const plugin = await AutomatonPlugin({
    client: {
      session: {
        messages({ path }) {
          assert.equal(path.id, 'session-1')
          return Promise.resolve({ data: sessionMessages })
        },
        prompt(call) {
          promptCalls.push(call)
          sessionMessages = [
            ...sessionMessages,
            { info: { role: 'user' }, parts: call.body.parts }
          ]
          return Promise.resolve({ data: { id: 'message-1' } })
        }
      }
    },
    directory: root,
    worktree: root
  })

  await plugin.event({ event: { type: 'session.created', properties: { info: { id: 'session-1' } } } })

  assert.equal(promptCalls.length, 1)
  assert.equal(promptCalls[0].path.id, 'session-1')
  assert.equal(promptCalls[0].body.noReply, true)
  assert.match(promptCalls[0].body.parts[0].text, /^<automaton_reminder> This project has the Automaton stage-gated harness installed\./)
  assert.match(promptCalls[0].body.parts[0].text, /State JSON: \.agent\/\.automaton\/state\/current\.json \(change=persist-opencode; stage=frame\)\./)

  await plugin['chat.message'](
    { sessionID: 'session-1' },
    { message: { role: 'user' }, parts: [{ type: 'text', text: 'hello' }] }
  )

  assert.equal(promptCalls.length, 1)
})

test('OpenCode plugin uses chat.message as persisted injection fallback', async () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-opencode-chat-message-'))
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')
  const promptCalls = []

  installHost(getHost('opencode'), { root, sourceRoot })

  const { AutomatonPlugin } = await import(pathToFileURL(pluginTarget).href)
  const plugin = await AutomatonPlugin({
    client: {
      session: {
        messages() {
          return Promise.resolve({ data: [] })
        },
        prompt(call) {
          promptCalls.push(call)
          return Promise.resolve({ data: { id: 'message-1' } })
        }
      }
    },
    directory: root,
    worktree: root
  })

  await plugin['chat.message'](
    { sessionID: 'session-2' },
    { message: { role: 'user' }, parts: [{ type: 'text', text: 'hello' }] }
  )

  assert.equal(promptCalls.length, 1)
  assert.equal(promptCalls[0].path.id, 'session-2')
  assert.equal(promptCalls[0].body.noReply, true)
  assert.match(promptCalls[0].body.parts[0].text, /^<automaton_reminder>/)

  await plugin['chat.message'](
    { sessionID: 'session-2' },
    { message: { role: 'user' }, parts: [{ type: 'text', text: 'Automaton: already persisted' }] }
  )

  assert.equal(promptCalls.length, 1)
})

test('OpenCode plugin persists compacted context when session id is available', async () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-opencode-compact-persist-'))
  const pluginTarget = join(root, '.opencode', 'plugins', 'automaton.js')
  const promptCalls = []

  installHost(getHost('opencode'), { root, sourceRoot })

  const { AutomatonPlugin } = await import(pathToFileURL(pluginTarget).href)
  const plugin = await AutomatonPlugin({
    client: {
      session: {
        messages() {
          return Promise.resolve({
            data: [{ info: { role: 'user' }, parts: [{ type: 'text', text: 'Automaton: existing context' }] }]
          })
        },
        prompt(call) {
          promptCalls.push(call)
          return Promise.resolve({ data: { id: 'message-1' } })
        }
      }
    },
    directory: root,
    worktree: root
  })

  await plugin.event({ event: { type: 'session.compacted', properties: { sessionID: 'session-3' } } })

  assert.equal(promptCalls.length, 1)
  assert.equal(promptCalls[0].path.id, 'session-3')
  assert.equal(promptCalls[0].body.noReply, true)
  assert.match(promptCalls[0].body.parts[0].text, /Context compacted/)
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

test('host install generates HOST-TOOLS.md only in the auto-execute skill', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-host-tools-single-'))

  installHost(getHost('claude'), { root, sourceRoot })

  const skillsRoot = join(root, '.claude', 'skills')
  assert.equal(existsSync(join(skillsRoot, 'auto-execute', 'references', 'HOST-TOOLS.md')), true)
  for (const skill of ['auto-frame', 'auto-plan', 'auto-verify', 'auto-resume', 'auto-onboard', 'auto-office-hours', 'auto-ceo-review', 'auto-eng-review']) {
    assert.equal(
      existsSync(join(skillsRoot, skill, 'references', 'HOST-TOOLS.md')),
      false,
      `${skill} must not carry a HOST-TOOLS.md copy`
    )
  }
})

test('reinstalling removes stale per-skill HOST-TOOLS copies', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-host-tools-stale-'))
  const host = getHost('claude')
  const staleTarget = join(root, '.claude', 'skills', 'auto-frame', 'references', 'HOST-TOOLS.md')
  const keepTarget = join(root, '.claude', 'skills', 'auto-execute', 'references', 'HOST-TOOLS.md')

  installHost(host, { root, sourceRoot })

  // Simulate a prior install that scattered HOST-TOOLS.md into a non-dispatching skill.
  mkdirSync(join(root, '.claude', 'skills', 'auto-frame', 'references'), { recursive: true })
  writeFileSync(staleTarget, '# stale host tools\n', 'utf8')

  installHost(host, { root, sourceRoot })

  assert.equal(existsSync(staleTarget), false)
  assert.equal(existsSync(keepTarget), true)
  assert.equal(existsSync(join(root, '.agent', '.automaton', 'state', 'install-manifest.json')), false)
})

// Derived from the single source of truth so this list can never drift from the
// roles installHost()/uninstallHost() actually act on.
const AUTOMATON_AGENT_NAMES = SUBAGENT_ROLES.map((role) => role.agentName)

test('automaton agent role ids are append-only — shipped ids are never renamed or removed (DD-008)', () => {
  // DD-008: a newer uninstaller cleans an older install only because its role-id list
  // is a superset of every earlier version's. Renaming or removing a shipped id breaks
  // that guarantee and strands files. New roles may be appended freely; when one ships,
  // add it to SHIPPED_ROLE_IDS. Never delete from this list.
  const SHIPPED_ROLE_IDS = ['implementer', 'spec-reviewer', 'quality-reviewer']
  const currentIds = SUBAGENT_ROLES.map((role) => role.id)
  for (const id of SHIPPED_ROLE_IDS) {
    assert.ok(
      currentIds.includes(id),
      `shipped role id "${id}" must remain present — ids are append-only (DD-008); ` +
      `renaming or removing a shipped id breaks cross-version uninstall`
    )
  }
})

test('Claude install generates three host-native automaton subagent definitions', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-claude-agents-'))

  installHost(getHost('claude'), { root, sourceRoot })

  for (const agentName of AUTOMATON_AGENT_NAMES) {
    const target = join(root, '.claude', 'agents', `${agentName}.md`)
    assert.equal(existsSync(target), true, `${agentName}.md must be installed`)
    const content = readFileSync(target, 'utf8')
    assert.match(content, new RegExp(`^---\\nname: ${agentName}\\n`), `${agentName}.md must declare its name in YAML frontmatter`)
    assert.match(content, /^description: /m, `${agentName}.md must declare a description`)
  }

  // Role body content flows verbatim into the generated agent.
  const implementer = readFileSync(join(root, '.claude', 'agents', 'automaton-implementer.md'), 'utf8')
  assert.match(implementer, /Only `auto-execute`.*dispatches Automaton subagents/, 'implementer agent must carry the recursion guard from the role body')
  assert.match(implementer, /STATUS: DONE \| DONE_WITH_CONCERNS \| NEEDS_CONTEXT \| BLOCKED/, 'implementer agent must carry the status envelope from the role body')
  assert.match(implementer, /Do not run any `git` write command/, 'implementer agent must carry the no-git boundary from the role body')

  // Reviewer agents are restricted to read-only tools so a host runtime cannot mutate
  // project files even if the role body's no-edit intent is bypassed.
  const specReviewer = readFileSync(join(root, '.claude', 'agents', 'automaton-spec-reviewer.md'), 'utf8')
  const qualityReviewer = readFileSync(join(root, '.claude', 'agents', 'automaton-quality-reviewer.md'), 'utf8')
  for (const reviewer of [specReviewer, qualityReviewer]) {
    assert.match(reviewer, /^tools: Read, Grep, Glob$/m, 'reviewer agent must restrict tools to read-only')
    assert.match(reviewer, /Do not edit code, tests, or any project artifacts/, 'reviewer role body must restate no-edit intent')
  }
  // Implementer inherits default tools (no explicit restriction line).
  assert.doesNotMatch(implementer, /^tools: Read, Grep, Glob$/m, 'implementer agent must not restrict tools')
})

test('Codex install generates three host-native automaton subagent definitions', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-codex-agents-'))

  installHost(getHost('codex'), { root, sourceRoot })

  for (const agentName of AUTOMATON_AGENT_NAMES) {
    const target = join(root, '.codex', 'agents', `${agentName}.toml`)
    assert.equal(existsSync(target), true, `${agentName}.toml must be installed`)
    const content = readFileSync(target, 'utf8')
    assert.match(content, new RegExp(`^name = "${agentName}"`), `${agentName}.toml must declare its name`)
    assert.match(content, /^description = ".+"$/m, `${agentName}.toml must declare a description`)
    assert.match(content, /^\[features\]$/m, `${agentName}.toml must include a [features] block`)
    assert.match(content, /^multi_agent = false$/m, `${agentName}.toml must disable nested subagent spawning`)
    assert.doesNotMatch(content, /multi_agent_v2/, `${agentName}.toml must not use the unverified multi_agent_v2 key`)
    assert.match(content, /^developer_instructions = '''/m, `${agentName}.toml must use a literal multi-line string for developer_instructions`)
  }

  const implementer = readFileSync(join(root, '.codex', 'agents', 'automaton-implementer.toml'), 'utf8')
  assert.match(implementer, /Only `auto-execute`.*dispatches Automaton subagents/, 'implementer agent must carry the recursion guard from the role body')
  assert.match(implementer, /STATUS: DONE \| DONE_WITH_CONCERNS \| NEEDS_CONTEXT \| BLOCKED/)
  assert.match(implementer, /^sandbox_mode = "workspace-write"$/m, 'implementer agent must request workspace-write sandbox')

  // TOML scoping: top-level keys (name/description/sandbox_mode/developer_instructions)
  // must appear before any [table] declaration. Otherwise they'd be scoped into [features]
  // and the agent would have no developer_instructions at top level.
  for (const agentName of AUTOMATON_AGENT_NAMES) {
    const content = readFileSync(join(root, '.codex', 'agents', `${agentName}.toml`), 'utf8')
    const featuresIndex = content.indexOf('[features]')
    const devInstrIndex = content.indexOf('developer_instructions')
    assert.ok(featuresIndex > 0, `${agentName}.toml must include a [features] table`)
    assert.ok(devInstrIndex > 0, `${agentName}.toml must include developer_instructions`)
    assert.ok(devInstrIndex < featuresIndex, `${agentName}.toml must place developer_instructions before [features] (TOML table scoping)`)
  }

  const specReviewer = readFileSync(join(root, '.codex', 'agents', 'automaton-spec-reviewer.toml'), 'utf8')
  const qualityReviewer = readFileSync(join(root, '.codex', 'agents', 'automaton-quality-reviewer.toml'), 'utf8')
  for (const reviewer of [specReviewer, qualityReviewer]) {
    assert.match(reviewer, /^sandbox_mode = "read-only"$/m, 'reviewer agent must request read-only sandbox')
    assert.match(reviewer, /Do not edit code, tests, or any project artifacts/, 'reviewer role body must restate no-edit intent')
  }
})

test('OpenCode install generates three host-native automaton subagent definitions', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-opencode-agents-'))

  installHost(getHost('opencode'), { root, sourceRoot })

  for (const agentName of AUTOMATON_AGENT_NAMES) {
    const target = join(root, '.opencode', 'agents', `${agentName}.md`)
    assert.equal(existsSync(target), true, `${agentName}.md must be installed`)
    const content = readFileSync(target, 'utf8')
    assert.match(content, /^---\nmode: subagent\n/, `${agentName}.md must declare mode: subagent`)
    assert.match(content, /^description: /m, `${agentName}.md must declare a description`)
    assert.match(content, /^permission:/m, `${agentName}.md must declare a permission block`)
    // `permission.write` is not a valid OpenCode permission key; write/edit/apply_patch
    // are gated by `permission.edit` in the current docs schema.
    assert.doesNotMatch(content, /^\s+write:/m, `${agentName}.md must not use the non-existent permission.write key`)
    // Portable recursion guard: subagents deny the Task tool so they cannot fan out.
    assert.match(content, /^\s+task: deny$/m, `${agentName}.md must deny the Task tool as a portable recursion guard`)
  }

  const implementer = readFileSync(join(root, '.opencode', 'agents', 'automaton-implementer.md'), 'utf8')
  assert.match(implementer, /Only `auto-execute`.*dispatches Automaton subagents/, 'implementer agent must carry the recursion guard from the role body')
  assert.match(implementer, /STATUS: DONE \| DONE_WITH_CONCERNS \| NEEDS_CONTEXT \| BLOCKED/)
  assert.match(implementer, /^\s+edit: allow$/m, 'implementer agent must allow edit')
  assert.match(implementer, /^\s+bash: allow$/m, 'implementer agent must allow bash')

  const specReviewer = readFileSync(join(root, '.opencode', 'agents', 'automaton-spec-reviewer.md'), 'utf8')
  const qualityReviewer = readFileSync(join(root, '.opencode', 'agents', 'automaton-quality-reviewer.md'), 'utf8')
  for (const reviewer of [specReviewer, qualityReviewer]) {
    assert.match(reviewer, /^\s+edit: deny$/m, 'reviewer agent must deny edit')
    assert.match(reviewer, /^\s+bash: deny$/m, 'reviewer agent must deny bash')
    assert.match(reviewer, /Do not edit code, tests, or any project artifacts/, 'reviewer role body must restate no-edit intent')
  }
})

test('install compiles role bodies into agent files without shipping role sources', () => {
  // Q1 redundancy guard: a role body must reach the target only as the compiled
  // host-native agent file — never duplicated into the installed skill as a source
  // file. role-sources/ is a build input skipped on copy; references/ keeps only the
  // runtime dispatch slots.
  const root = mkdtempSync(join(tmpdir(), 'automaton-install-no-role-dup-'))
  installHost(getHost('claude'), { root, sourceRoot })

  for (const agentName of AUTOMATON_AGENT_NAMES) {
    assert.equal(
      existsSync(join(root, '.claude', 'agents', `${agentName}.md`)),
      true,
      `${agentName}.md must be installed as the host-native agent (the live role body)`
    )
  }

  const installedExecute = join(root, '.claude', 'skills', 'auto-execute')
  assert.equal(
    existsSync(join(installedExecute, 'role-sources')),
    false,
    'role-sources/ is a build input and must not ship into the installed skill'
  )
  for (const roleFile of ['implementer-role.md', 'spec-reviewer-role.md', 'quality-reviewer-role.md']) {
    assert.equal(
      existsSync(join(installedExecute, 'references', roleFile)),
      false,
      `${roleFile} must not be duplicated into the installed references/`
    )
  }

  // The per-call dispatch slots (the only role-adjacent runtime references) still ship.
  assert.equal(
    existsSync(join(installedExecute, 'references', 'implementer-prompt.md')),
    true,
    'dispatch prompt slots must still ship into references/'
  )
})

test('reinstalling refreshes stale generated subagent definitions', () => {
  // Generated agent files are derived install outputs; a stale local edit must be
  // overwritten on reinstall so durable role authoring stays in skills/auto-execute/role-sources/*-role.md.
  const root = mkdtempSync(join(tmpdir(), 'automaton-reinstall-agents-stale-'))
  const host = getHost('claude')
  const target = join(root, '.claude', 'agents', 'automaton-implementer.md')

  installHost(host, { root, sourceRoot })
  writeFileSync(target, '# stale generated agent\n', 'utf8')

  installHost(host, { root, sourceRoot })

  const refreshed = readFileSync(target, 'utf8')
  assert.doesNotMatch(refreshed, /^# stale generated agent$/m)
  assert.match(refreshed, /^name: automaton-implementer$/m)
})

test('uninstall removes generated automaton agents but preserves unrelated user agent files', () => {
  // Explicit regression case for PLAN slice 2: seed an unrelated user agent in the
  // same directory and confirm uninstallHost leaves it alone while removing the three
  // automaton-* files we generated.
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-agents-preserve-'))
  const host = getHost('claude')
  const userAgentTarget = join(root, '.claude', 'agents', 'my-other-agent.md')
  const userContent = '---\nname: my-other-agent\n---\n\n# user agent\n'

  mkdirSync(join(root, '.claude', 'agents'), { recursive: true })
  writeFileSync(userAgentTarget, userContent, 'utf8')

  installHost(host, { root, sourceRoot })

  for (const agentName of AUTOMATON_AGENT_NAMES) {
    assert.equal(existsSync(join(root, '.claude', 'agents', `${agentName}.md`)), true, `${agentName}.md must exist after install`)
  }
  assert.equal(existsSync(userAgentTarget), true, 'user agent must still exist after install')

  uninstallHost(host, { root, sourceRoot })

  for (const agentName of AUTOMATON_AGENT_NAMES) {
    assert.equal(existsSync(join(root, '.claude', 'agents', `${agentName}.md`)), false, `${agentName}.md must be removed by uninstall`)
  }
  assert.equal(readFileSync(userAgentTarget, 'utf8'), userContent, 'unrelated user agent must be preserved by uninstall')
  assert.equal(existsSync(join(root, '.claude', 'agents')), true, '.claude/agents/ must remain because the user agent is still there')
})

test('uninstall prunes empty .<host>/agents/ directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-agents-prune-'))
  const host = getHost('claude')

  installHost(host, { root, sourceRoot })
  uninstallHost(host, { root, sourceRoot })

  assert.equal(existsSync(join(root, '.claude', 'agents')), false, 'empty .claude/agents/ must be pruned on uninstall')
})

test('Codex uninstall removes generated automaton agent files and prunes empty .codex/agents/', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-codex-agents-'))
  const host = getHost('codex')

  installHost(host, { root, sourceRoot })
  for (const agentName of AUTOMATON_AGENT_NAMES) {
    assert.equal(existsSync(join(root, '.codex', 'agents', `${agentName}.toml`)), true)
  }

  uninstallHost(host, { root, sourceRoot })

  for (const agentName of AUTOMATON_AGENT_NAMES) {
    assert.equal(existsSync(join(root, '.codex', 'agents', `${agentName}.toml`)), false)
  }
  assert.equal(existsSync(join(root, '.codex', 'agents')), false, 'empty .codex/agents/ must be pruned on uninstall')
})

test('OpenCode uninstall removes generated automaton agent files and prunes empty .opencode/agents/', () => {
  const root = mkdtempSync(join(tmpdir(), 'automaton-uninstall-opencode-agents-'))
  const host = getHost('opencode')

  installHost(host, { root, sourceRoot })
  for (const agentName of AUTOMATON_AGENT_NAMES) {
    assert.equal(existsSync(join(root, '.opencode', 'agents', `${agentName}.md`)), true)
  }

  uninstallHost(host, { root, sourceRoot })

  for (const agentName of AUTOMATON_AGENT_NAMES) {
    assert.equal(existsSync(join(root, '.opencode', 'agents', `${agentName}.md`)), false)
  }
  assert.equal(existsSync(join(root, '.opencode', 'agents')), false, 'empty .opencode/agents/ must be pruned on uninstall')
})

test('generated HOST-TOOLS.md names the three automaton subagents on every host', () => {
  // Slice 3 acceptance: each host's HOST-TOOLS.md must point coordinators at named
  // Automaton agents rather than generic worker/explorer prose. The Automaton Subagents
  // section is sourced from the same SUBAGENT_ROLES list installHost() iterates, so
  // adding a fourth role would land here automatically.
  for (const hostId of ['claude', 'codex', 'opencode']) {
    const root = mkdtempSync(join(tmpdir(), `automaton-host-tools-named-${hostId}-`))
    installHost(getHost(hostId), { root, sourceRoot })

    const hostToolsPath = join(root, `.${hostId}`, 'skills', 'auto-execute', 'references', 'HOST-TOOLS.md')
    const hostTools = readFileSync(hostToolsPath, 'utf8')

    assert.match(hostTools, /## Automaton Subagents/m, `${hostId} HOST-TOOLS.md must include the Automaton Subagents section`)
    for (const agentName of AUTOMATON_AGENT_NAMES) {
      assert.match(hostTools, new RegExp(`\`${agentName}\``), `${hostId} HOST-TOOLS.md must name ${agentName}`)
    }
    // No fallback to role-body prompt injection.
    assert.match(hostTools, /Dispatch only by named agent/, `${hostId} HOST-TOOLS.md must require named-agent dispatch`)
    assert.match(hostTools, /Do not fall back to runtime-curated prompt injection/, `${hostId} HOST-TOOLS.md must forbid runtime prompt-injection fallback`)
    // The legacy generic guidance must be gone.
    assert.doesNotMatch(hostTools, /recommend the non-subagent fallback skill/, `${hostId} HOST-TOOLS.md must not advertise a generic fallback recommendation`)
  }
})

test('generated OpenCode HOST-TOOLS.md surfaces permission.task as a dispatch precondition', () => {
  // PLAN slice 3 acceptance: the primary agent's permission.task must allow
  // automaton-* for Task-tool named-agent dispatch to work. HOST-TOOLS.md must
  // surface that as a precondition rather than letting dispatch fail silently.
  const root = mkdtempSync(join(tmpdir(), 'automaton-host-tools-opencode-precondition-'))
  installHost(getHost('opencode'), { root, sourceRoot })

  const hostTools = readFileSync(join(root, '.opencode', 'skills', 'auto-execute', 'references', 'HOST-TOOLS.md'), 'utf8')
  assert.match(hostTools, /^- precondition: /m, 'OpenCode HOST-TOOLS.md must include a precondition bullet')
  assert.match(hostTools, /permission\.task/, 'OpenCode HOST-TOOLS.md must reference permission.task')
  assert.match(hostTools, /automaton-implementer/, 'OpenCode HOST-TOOLS.md precondition must name automaton-implementer')
})

test('install and uninstall preserve every user-owned file across the realistic config surface', () => {
  // Regression lockdown: the install logic targets files by name (`automaton-*`,
  // `session-start.mjs`, `automaton.js`, `HOST-TOOLS.md`), by directory prefix
  // (`.<host>/skills/auto-*`, `.agent/.automaton/`), and by content-block (specific
  // hook entries inside JSON configs, specific feature lines inside config.toml).
  // Anything outside that footprint must survive an install→uninstall cycle untouched.
  //
  // This test seeds every realistic user-owned config-file type the three hosts
  // support and asserts byte-identity (for unmanaged files) or semantic preservation
  // (for the three files install merges into). Any future change that widens the
  // surface should fail here rather than silently mutate user content.

  const root = mkdtempSync(join(tmpdir(), 'automaton-user-surface-'))

  // Unmanaged: install/uninstall must leave these byte-identical.
  const unmanagedUserFiles = {
    // detection markers Automaton inspects but must never edit
    'CLAUDE.md': '# Project Instructions for Claude\n',
    'AGENTS.md': '# AGENTS.md\nProject-level agent instructions.\n',
    'opencode.json': '{\n  "$schema": "https://opencode.ai/config.json",\n  "theme": "dracula"\n}\n',
    // .claude/ user surface
    '.claude/settings.local.json': '{\n  "permissions": { "allow": ["Bash(pnpm:*)"] }\n}\n',
    '.claude/.mcp.json': '{\n  "mcpServers": { "linear": { "command": "npx" } }\n}\n',
    '.claude/commands/deploy.md': '---\ndescription: Deploy\n---\nDeploy.\n',
    '.claude/commands/team/audit.md': '---\ndescription: Audit\n---\nAudit.\n',
    '.claude/output-styles/concise.md': '---\nname: concise\n---\nBe terse.\n',
    '.claude/agents/code-reviewer.md': '---\nname: code-reviewer\n---\nReview code.\n',
    '.claude/skills/team-style/SKILL.md': '# Team Style\n',
    '.claude/hooks/user-pre-tool.mjs': '#!/usr/bin/env node\n// user hook\n',
    // .codex/ user surface (incl. synthetic auth.json so secrets-handling is explicit)
    '.codex/auth.json': '{ "OPENAI_API_KEY": "sk-fake-test-key" }\n',
    '.codex/prompts/refactor.toml': 'name = "refactor"\n',
    '.codex/skills/team-style/SKILL.md': '# Team Style\n',
    '.codex/agents/my-helper.toml': 'name = "my-helper"\n',
    '.codex/hooks/user-start.mjs': '// user start hook\n',
    '.codex/hooks/user-stop.mjs': '// user stop hook\n',
    // .opencode/ user surface
    '.opencode/commands/format.md': '---\ndescription: Format\n---\nFormat.\n',
    '.opencode/mcp/linear.json': '{ "name": "linear" }\n',
    '.opencode/skills/team-style/SKILL.md': '# Team Style\n',
    '.opencode/agents/code-reviewer.md': '---\nmode: subagent\n---\nReview.\n',
    '.opencode/plugins/user-helper.js': '// user plugin\n'
  }

  // Merged: install necessarily edits these; user content must survive semantically.
  const mergedUserFiles = {
    '.claude/settings.json': {
      content: '{\n  "env": { "EDITOR": "nvim" },\n  "permissions": { "allow": ["Read", "Edit"] }\n}\n',
      userInvariants: [/"EDITOR"/, /"nvim"/, /"Read"/, /"Edit"/]
    },
    '.codex/config.toml': {
      content: 'model = "gpt-5.4"\nprofile = "personal"\n\n[features]\nsome_user_flag = true\n\n[mcp_servers.linear]\ncommand = "npx"\nargs = ["-y", "@modelcontextprotocol/server-linear"]\n',
      userInvariants: [/^model = "gpt-5\.4"$/m, /^profile = "personal"$/m, /^some_user_flag = true$/m, /\[mcp_servers\.linear\]/, /@modelcontextprotocol\/server-linear/]
    },
    '.codex/hooks.json': {
      content: '{\n  "metadata": { "owner": "user" },\n  "hooks": {\n    "Stop": [{ "hooks": [{ "type": "command", "command": "node .codex/hooks/user-stop.mjs" }]}]\n  }\n}\n',
      userInvariants: [/"owner":\s*"user"/, /user-stop\.mjs/]
    }
  }

  const seed = (relPath, content) => {
    const abs = join(root, relPath)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf8')
  }
  for (const [relPath, content] of Object.entries(unmanagedUserFiles)) {
    seed(relPath, content)
  }
  for (const [relPath, { content }] of Object.entries(mergedUserFiles)) {
    seed(relPath, content)
  }

  // ──── INSTALL ────
  for (const host of HOSTS) {
    installHost(host, { root, sourceRoot })
  }

  // Post-install: every unmanaged file is byte-identical to its seed.
  for (const [relPath, originalContent] of Object.entries(unmanagedUserFiles)) {
    assert.equal(
      readFileSync(join(root, relPath), 'utf8'),
      originalContent,
      `install must not modify unmanaged user file: ${relPath}`
    )
  }
  // Post-install: every merged file still carries the user content invariants.
  for (const [relPath, { userInvariants }] of Object.entries(mergedUserFiles)) {
    const current = readFileSync(join(root, relPath), 'utf8')
    for (const pattern of userInvariants) {
      assert.match(current, pattern, `install must preserve user content matching ${pattern} in ${relPath}`)
    }
  }

  // ──── UNINSTALL ────
  for (const host of HOSTS) {
    uninstallHost(host, { root, sourceRoot })
  }

  // Post-uninstall: every unmanaged file STILL byte-identical to its seed.
  for (const [relPath, originalContent] of Object.entries(unmanagedUserFiles)) {
    assert.equal(
      readFileSync(join(root, relPath), 'utf8'),
      originalContent,
      `uninstall must not modify unmanaged user file: ${relPath}`
    )
  }
  // Post-uninstall: merged files (if still present) preserve user content; if they
  // were removed it can only be because they became empty after our content left,
  // which would mean user invariants couldn't have been there in the first place.
  for (const [relPath, { userInvariants }] of Object.entries(mergedUserFiles)) {
    const abs = join(root, relPath)
    assert.equal(existsSync(abs), true, `uninstall must keep ${relPath} because it carried user content`)
    const current = readFileSync(abs, 'utf8')
    for (const pattern of userInvariants) {
      assert.match(current, pattern, `uninstall must preserve user content matching ${pattern} in ${relPath}`)
    }
  }

  // Post-uninstall: Automaton's merged-content additions are gone (except the
  // intentionally-preserved `multi_agent = true` line in .codex/config.toml).
  const codexConfig = readFileSync(join(root, '.codex/config.toml'), 'utf8')
  assert.doesNotMatch(codexConfig, /^hooks = true$/m, 'uninstall must remove hooks = true from .codex/config.toml')
  assert.match(codexConfig, /^multi_agent = true$/m, '.codex/config.toml retains multi_agent = true as the documented useful-flag gift')

  const claudeSettings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8'))
  const claudeAutomatonHooks = (claudeSettings.hooks?.SessionStart ?? [])
    .flatMap((group) => group.hooks ?? [])
    .filter((hook) => typeof hook.command === 'string' && hook.command.includes('.claude/hooks/session-start.mjs'))
  assert.equal(claudeAutomatonHooks.length, 0, 'uninstall must remove the Automaton SessionStart hook from .claude/settings.json')

  const codexHooksJson = JSON.parse(readFileSync(join(root, '.codex/hooks.json'), 'utf8'))
  const codexAutomatonHooks = (codexHooksJson.hooks?.SessionStart ?? [])
    .flatMap((group) => group.hooks ?? [])
    .filter((hook) => typeof hook.command === 'string' && hook.command.includes('.codex/hooks/session-start.mjs'))
  assert.equal(codexAutomatonHooks.length, 0, 'uninstall must remove the Automaton SessionStart hook from .codex/hooks.json')
})
