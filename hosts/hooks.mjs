export function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`
}

// Hook commands run through the host's shell. Prefer whatever `node` the session
// PATH resolves so the hook survives the install-time runtime being upgraded or
// deleted (nvm version switches, ephemeral bundled runtimes). The interpreter
// that ran the installer is kept only as a fallback for shells whose PATH
// carries no node at all.
export function renderNodeHookCommand(scriptRef) {
  return `command -v node >/dev/null 2>&1 && exec node ${scriptRef}; exec ${shellQuote(process.execPath)} ${scriptRef}`
}

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
