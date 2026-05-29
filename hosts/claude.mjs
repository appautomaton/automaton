import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { renderSessionStartHook, shellQuote } from './hooks.mjs'

function renderClaudeHookCommand(scriptName) {
  return `${shellQuote(process.execPath)} "$CLAUDE_PROJECT_DIR"/.claude/hooks/${scriptName}.mjs`
}

function renderClaudeSettings() {
  return JSON.stringify(
    {
      hooks: {
        SessionStart: [
          {
            matcher: 'startup|resume|clear|compact',
            hooks: [
              {
                type: 'command',
                command: renderClaudeHookCommand('session-start')
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

// Tier → Claude model alias. Claude agent frontmatter accepts model aliases, so the
// light tier maps to haiku. Tiers with no safe model for a host are left unset.
const CLAUDE_TIER_MODELS = { light: 'haiku' }

// Render a host-native subagent definition for Claude Code. The static role body
// (identity, boundaries, status envelope) is provided by the caller from the
// `*-role.md` source file; this function only wraps it in YAML frontmatter.
// Every non-edit role (reviewers, librarian) is restricted to read-only tools so a
// misuse cannot edit project files even when the role body's no-edit intent is bypassed.
function renderClaudeAgentDefinition(role, roleBody) {
  const lines = [
    '---',
    `name: ${role.agentName}`,
    `description: ${role.description}`
  ]

  if (role.intent !== 'edit') {
    lines.push('tools: Read, Grep, Glob')
  }

  const model = role.modelTier ? CLAUDE_TIER_MODELS[role.modelTier] : undefined
  if (model) {
    lines.push(`model: ${model}`)
  }

  lines.push('---', '', roleBody.trim(), '')
  return lines.join('\n')
}

export const claudeHost = {
  id: 'claude',
  skillRoot: '.claude/skills',
  instructionsFile: 'CLAUDE.md',
  toolMapping: {
    subagents: 'Use the Agent tool with `subagent_type` set to the installed automaton agent you are dispatching — `automaton-implementer`, `automaton-spec-reviewer`, `automaton-quality-reviewer`, or `automaton-librarian` (see the roster above). For the execute-stage agents pass the per-call dispatch packet (slice, constraints, acceptance criteria, implementation summary) from `auto-execute/references/*-prompt.md` as the prompt; for the read-only `automaton-librarian` pass the bounded question packet from `.agent/.automaton/references/LIBRARIAN.md`. The static role body is already installed under `.claude/agents/`, and Claude Code blocks the Agent tool inside subagent sessions so recursion is structurally impossible.',
    wait: 'Agent tool calls return their result to the coordinator when complete; no separate wait command is needed.',
    cleanup: 'No explicit close step is needed after an Agent result is returned.',
    tracking: 'Use TodoWrite for session-local progress tracking when useful.',
    unavailable: false
  },
  installFiles() {
    return {
      '.claude/settings.json': renderClaudeSettings(),
      '.claude/hooks/session-start.mjs': renderSessionStartHook()
    }
  },
  agentRelativePath(role) {
    return `.claude/agents/${role.agentName}.md`
  },
  renderAgentDefinition: renderClaudeAgentDefinition,
  detect(root) {
    return existsSync(join(root, '.claude')) || existsSync(join(root, 'CLAUDE.md'))
  }
}
