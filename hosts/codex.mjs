import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { renderSessionStartHook, shellQuote } from './hooks.mjs'

function renderHookCommand(root, scriptName) {
  return `${shellQuote(process.execPath)} ${shellQuote(resolve(root, '.codex', 'hooks', `${scriptName}.mjs`))}`
}

function renderCodexHooksConfig(root) {
  return JSON.stringify(
    {
      hooks: {
        SessionStart: [
          {
            matcher: 'startup|resume|clear',
            hooks: [
              {
                type: 'command',
                command: renderHookCommand(root, 'session-start')
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
  installFiles({ root = '.' } = {}) {
    return {
      '.codex/config.toml': `[features]\nhooks = true\nmulti_agent = true\n`,
      '.codex/hooks.json': renderCodexHooksConfig(root),
      '.codex/hooks/session-start.mjs': renderSessionStartHook()
    }
  },
  detect(root) {
    return existsSync(join(root, '.codex'))
  }
}
