import { existsSync } from 'node:fs'
import { join } from 'node:path'

function renderHookCommand(scriptName) {
  return `sh -lc 'root=$(git rev-parse --show-toplevel 2>/dev/null || pwd); while [ ! -f "$root/.codex/hooks/${scriptName}.mjs" ] && [ "$root" != "/" ]; do root=$(dirname "$root"); done; node "$root/.codex/hooks/${scriptName}.mjs"'`
}

function renderCodexHooksConfig() {
  return JSON.stringify(
    {
      hooks: {
        SessionStart: [
          {
            matcher: 'startup|resume',
            hooks: [
              {
                type: 'command',
                command: renderHookCommand('session-start')
              }
            ]
          }
        ],
        Stop: [
          {
            hooks: [
              {
                type: 'command',
                command: renderHookCommand('stop')
              }
            ]
          }
        ]
      }
    },
    null,
    2
  ) + '\n'
}

function renderSessionStartHook() {
  return [
    "import { dirname, join } from 'node:path'",
    "import { fileURLToPath } from 'node:url'",
    "import { buildSessionContext } from '../../.agent/.automaton/lib/context.mjs'",
    '',
    "const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')",
    '',
    'process.stdout.write(JSON.stringify({',
    '  hookSpecificOutput: {',
    "    hookEventName: 'SessionStart',",
    '    additionalContext: buildSessionContext(projectRoot)',
    '  }',
    "}) + '\\n')",
    ''
  ].join('\n')
}

function renderStopHook() {
  return [
    "import { dirname, join } from 'node:path'",
    "import { fileURLToPath } from 'node:url'",
    "import { syncStatusPointerFromCurrentState } from '../../.agent/.automaton/bin/sync-status-pointer.mjs'",
    '',
    "const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')",
    'syncStatusPointerFromCurrentState({',
    "  currentTarget: join(projectRoot, '.agent', '.automaton', 'state', 'current.json'),",
    "  statusTarget: join(projectRoot, '.agent', 'steering', 'STATUS.md')",
    '})',
    '',
    "process.stdout.write('')",
    ''
  ].join('\n')
}

export const codexHost = {
  id: 'codex',
  skillRoot: '.codex/skills',
  legacySkillRoots: ['.agents/skills'],
  instructionsFile: 'AGENTS.md',
  toolMapping: {
    subagents: 'Use spawn_agent with a complete task message. Prefer built-in agent_type="worker" for implementation, agent_type="explorer" for read-only discovery, or a project custom agent defined as TOML with name, description, and developer_instructions.',
    wait: 'Use wait to collect subagent results before continuing review or integration.',
    cleanup: 'Use close_agent after each completed subagent to free the slot.',
    tracking: 'Use update_plan for session-local progress tracking when useful.',
    configuration: 'Requires [features].multi_agent = true in .codex/config.toml.',
    unavailable: false
  },
  installFiles() {
    return {
      '.codex/config.toml': `[features]\ncodex_hooks = true\nmulti_agent = true\n`,
      '.codex/hooks.json': renderCodexHooksConfig(),
      '.codex/hooks/session-start.mjs': renderSessionStartHook(),
      '.codex/hooks/stop.mjs': renderStopHook()
    }
  },
  detect(root) {
    return existsSync(join(root, '.codex'))
  }
}
