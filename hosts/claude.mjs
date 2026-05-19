import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { renderSessionStartHook, renderStopHook } from './hooks.mjs'

function renderClaudeHookCommand(scriptName) {
  return `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/${scriptName}.mjs`
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
        ],
        Stop: [
          {
            hooks: [
              {
                type: 'command',
                command: renderClaudeHookCommand('stop')
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

export const claudeHost = {
  id: 'claude',
  skillRoot: '.claude/skills',
  instructionsFile: 'CLAUDE.md',
  toolMapping: {
    subagents: 'Use the Agent tool to dispatch host-native subagents. Task remains a documented alias in existing Claude Code configurations. Provide a short description, the full curated prompt, and the most specific available subagent type.',
    wait: 'Agent tool calls return their result to the coordinator when complete; no separate wait command is needed.',
    cleanup: 'No explicit close step is needed after an Agent result is returned.',
    tracking: 'Use TodoWrite for session-local progress tracking when useful.',
    unavailable: false
  },
  installFiles() {
    return {
      '.claude/settings.json': renderClaudeSettings(),
      '.claude/hooks/session-start.mjs': renderSessionStartHook(),
      '.claude/hooks/stop.mjs': renderStopHook()
    }
  },
  detect(root) {
    return existsSync(join(root, '.claude')) || existsSync(join(root, 'CLAUDE.md'))
  }
}
