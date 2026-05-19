export function renderSessionStartHook() {
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

export function renderStopHook() {
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
