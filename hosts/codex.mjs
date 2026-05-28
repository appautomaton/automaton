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

// Render a host-native subagent definition for Codex. Codex documents project agents
// as standalone TOML files with required `name`, `description`, `developer_instructions`;
// optional `sandbox_mode` enforces a per-agent baseline that the runtime may still override.
// `[features].multi_agent = false` disables nested subagent spawning inside this subagent
// (the structural half of the recursion guard); the prose half lives in the role body.
// `multi_agent_v2` is not part of the current documented schema and is intentionally omitted.
// Literal multi-line strings (`'''...'''`) carry the role body verbatim with no escape pass.
//
// Top-level keys MUST appear before any `[table]` declaration; otherwise TOML scopes them
// into the table. The `[features]` table is rendered last for that reason.
function renderCodexAgentDefinition(role, roleBody) {
  const sandboxMode = role.intent === 'review' ? 'read-only' : 'workspace-write'
  return [
    `name = "${role.agentName}"`,
    `description = "${role.description}"`,
    `sandbox_mode = "${sandboxMode}"`,
    `developer_instructions = '''`,
    roleBody.trim(),
    `'''`,
    '',
    '[features]',
    'multi_agent = false',
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
  installFiles({ root = '.' } = {}) {
    return {
      '.codex/config.toml': `[features]\nhooks = true\nmulti_agent = true\n`,
      '.codex/hooks.json': renderCodexHooksConfig(root),
      '.codex/hooks/session-start.mjs': renderSessionStartHook()
    }
  },
  agentRelativePath(role) {
    return `.codex/agents/${role.agentName}.toml`
  },
  renderAgentDefinition: renderCodexAgentDefinition,
  detect(root) {
    return existsSync(join(root, '.codex'))
  }
}
