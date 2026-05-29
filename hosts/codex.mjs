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
// Tier → Codex cheapness levers. Per-agent `model` and `model_reasoning_effort` are
// supported in custom-agent TOML. Model slugs are account-specific, so the portable
// light-tier lever is low reasoning effort; a deployment may also pin a model slug here.
const CODEX_TIER = {
  light: { model_reasoning_effort: 'low' }
}

function renderCodexAgentDefinition(role, roleBody) {
  const sandboxMode = role.intent === 'edit' ? 'workspace-write' : 'read-only'
  const lines = [
    `name = "${role.agentName}"`,
    `description = "${role.description}"`,
    `sandbox_mode = "${sandboxMode}"`
  ]
  const tier = role.modelTier ? CODEX_TIER[role.modelTier] : undefined
  if (tier?.model) {
    lines.push(`model = "${tier.model}"`)
  }
  if (tier?.model_reasoning_effort) {
    lines.push(`model_reasoning_effort = "${tier.model_reasoning_effort}"`)
  }
  lines.push(
    `developer_instructions = '''`,
    roleBody.trim(),
    `'''`,
    '',
    '[features]',
    'multi_agent = false',
    ''
  )
  return lines.join('\n')
}

export const codexHost = {
  id: 'codex',
  skillRoot: '.codex/skills',
  legacySkillRoots: ['.agents/skills'],
  instructionsFile: 'AGENTS.md',
  toolMapping: {
    subagents: 'Use `spawn_agent` with the named custom agent you are dispatching — `automaton-implementer`, `automaton-spec-reviewer`, `automaton-quality-reviewer`, or `automaton-librarian` (see the roster above). For the execute-stage agents pass the per-call dispatch packet (slice, constraints, acceptance criteria, implementation summary) from `auto-execute/references/*-prompt.md` as the task message; for the read-only `automaton-librarian` pass the bounded question packet from `.agent/.automaton/references/LIBRARIAN.md`. The role body is in the TOML file under `.codex/agents/`, and each TOML carries `[features].multi_agent = false` so the subagent cannot nest another subagent.',
    wait: 'Use wait to collect subagent results before continuing review or integration.',
    cleanup: 'Use close_agent after each completed subagent to free the slot.',
    tracking: 'Use update_plan for session-local progress tracking when useful.',
    configuration: 'Requires [features].multi_agent = true in the primary `.codex/config.toml` so the coordinator can spawn the named subagents.',
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
