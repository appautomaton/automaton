import { existsSync } from 'node:fs'
import { join } from 'node:path'

function renderAutomatonPlugin() {
  return [
    "import { existsSync } from 'node:fs'",
    "import { join, resolve } from 'node:path'",
    "import { buildSessionContext } from '../../.agent/.automaton/lib/context.mjs'",
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
    '// Flag-and-clear: session.compacted handler does not receive output.messages,',
    '// so it sets this flag; the next message-transform reads and clears it.',
    'let needsCompactedInject = false',
    '',
    'export const AutomatonPlugin = async ({ project, client, $, directory, worktree }) => {',
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
    "      if (event.type === 'session.compacted') {",
    '        needsCompactedInject = true',
    '        return',
    '      }',
    '    },',
    "    'experimental.chat.messages.transform': async (_input, output) => {",
    '      if (!output || !Array.isArray(output.messages) || output.messages.length === 0) return',
    "      const firstUser = output.messages.find((m) => m && m.info && m.info.role === 'user')",
    '      if (!firstUser || !Array.isArray(firstUser.parts) || firstUser.parts.length === 0) return',
    '',
    '      // Dedup: every Automaton context line starts with "Automaton:" — covers both',
    '      // active-state and no-state cases emitted by buildSessionContext.',
    "      if (firstUser.parts.some((p) => p && p.type === 'text' && typeof p.text === 'string' && p.text.startsWith('Automaton:'))) return",
    '',
    '      const compacted = needsCompactedInject',
    '      needsCompactedInject = false',
    '',
    '      const bootstrap = buildSessionContext(projectRoot, { compacted })',
    '      if (!bootstrap) return',
    '',
    '      const ref = firstUser.parts[0]',
    "      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap })",
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
