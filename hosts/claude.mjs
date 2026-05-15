import { existsSync } from 'node:fs'
import { join } from 'node:path'

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
