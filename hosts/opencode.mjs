import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

function renderAutomatonPlugin() {
  return [
    "import { existsSync } from 'node:fs'",
    "import { join, resolve } from 'node:path'",
    "import { syncStatusPointerFromCurrentState } from '../../.agent/.automaton/bin/sync-status-pointer.mjs'",
    '',
    'function resolveProjectRoot(worktree, directory) {',
    '  const candidates = [worktree, directory, process.cwd()]',
    '  for (const candidate of candidates) {',
    "    if (candidate && existsSync(join(candidate, '.agent'))) {",
    '      return candidate',
    '    }',
    '  }',
    '  let current = process.cwd()',
    '  while (current !== "/") {',
    "    if (existsSync(join(current, '.agent'))) {",
    '      return current',
    '    }',
    "    const parent = resolve(current, '..')",
    '    if (parent === current) break',
    '    current = parent',
    '  }',
    '  return process.cwd()',
    '}',
    '',
    'export const AutomatonPlugin = async ({ client, directory, worktree }) => {',
    '  const projectRoot = resolveProjectRoot(worktree, directory)',
    '',
    '  return {',
    '    event: async ({ event }) => {',
    "      if (event.type === 'session.idle') {",
    '        syncStatusPointerFromCurrentState({',
    "          currentTarget: join(projectRoot, '.agent', '.automaton', 'state', 'current.json'),",
    "          statusTarget: join(projectRoot, '.agent', 'steering', 'STATUS.md')",
    '        })',
    '        return',
    '      }',
    '    }',
    '  }',
    '}',
    ''
  ].join('\n')
}

export const opencodeHost = {
  id: 'opencode',
  skillRoot: '.opencode/skills',
  instructionsFile: 'opencode.json',
  toolMapping: {
    subagents: 'Use OpenCode native subagent routing, including @mention-style dispatch where available. Provide the complete curated prompt to the selected subagent.',
    wait: 'Wait for the OpenCode subagent response before dispatching dependent reviews.',
    cleanup: 'No Automaton cleanup step is required; follow OpenCode session conventions.',
    tracking: 'Use todowrite for session-local progress tracking when useful.',
    unavailable: false
  },
  installFiles() {
    return {
      '.opencode/plugins/automaton.js': renderAutomatonPlugin()
    }
  },
  detect(root) {
    return existsSync(join(root, '.opencode')) || existsSync(join(root, 'opencode.json'))
  }
}
