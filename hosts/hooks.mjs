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
    '// Claude Code writes the hook payload as JSON on stdin, with `source` set to',
    "// 'compact' after compaction. Hosts that pass no payload (or a non-JSON one)",
    '// leave `compacted` false, so the shared hook stays safe on every host.',
    "let payload = ''",
    'if (!process.stdin.isTTY) {',
    '  for await (const chunk of process.stdin) payload += chunk',
    '}',
    'let compacted = false',
    'try {',
    "  compacted = JSON.parse(payload).source === 'compact'",
    '} catch {',
    '  compacted = false',
    '}',
    '',
    'process.stdout.write(JSON.stringify({',
    '  hookSpecificOutput: {',
    "    hookEventName: 'SessionStart',",
    '    additionalContext: buildSessionContext(projectRoot, { compacted })',
    '  }',
    "}) + '\\n')",
    ''
  ].join('\n')
}
