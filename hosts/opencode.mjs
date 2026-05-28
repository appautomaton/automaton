import { existsSync } from 'node:fs'
import { join } from 'node:path'

function renderAutomatonPlugin() {
  return [
    "import { existsSync } from 'node:fs'",
    "import { join, resolve } from 'node:path'",
    "import { buildSessionContext } from '../../.agent/.automaton/lib/context.mjs'",
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
    'function unwrapData(result) {',
    "  return result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result",
    '}',
    '',
    'function isAutomatonTextPart(part) {',
    "  return part && part.type === 'text' && typeof part.text === 'string' && (part.text.startsWith('<automaton_reminder>') || part.text.startsWith('Automaton:'))",
    '}',
    '',
    'function messagesHaveAutomatonContext(messages) {',
    '  return Array.isArray(messages) && messages.some((message) => {',
    '    return message && Array.isArray(message.parts) && message.parts.some(isAutomatonTextPart)',
    '  })',
    '}',
    '',
    'function eventSessionID(event) {',
    "  if (!event || !event.properties) return null",
    "  if (typeof event.properties.sessionID === 'string') return event.properties.sessionID",
    "  if (event.properties.info && typeof event.properties.info.id === 'string') return event.properties.info.id",
    '  return null',
    '}',
    '',
    'async function logPluginWarning(client, message, error) {',
    '  if (!client || !client.app || typeof client.app.log !== "function") return',
    '  try {',
    '    await client.app.log({',
    '      body: {',
    "        service: 'automaton',",
    "        level: 'warn',",
    '        message,',
    '        extra: { error: error && error.message ? error.message : String(error) }',
    '      }',
    '    })',
    '  } catch {',
    '    // Logging must never break chat handling.',
    '  }',
    '}',
    '',
    '// Fallback for plugin hooks that cannot provide a session id.',
    'let needsCompactedInject = false',
    'const injectedSessions = new Set()',
    'const inFlightSessions = new Set()',
    'const pendingCompactedSessions = new Set()',
    '',
    'export const AutomatonPlugin = async ({ project, client, $, directory, worktree }) => {',
    '  const projectRoot = resolveProjectRoot(worktree, directory)',
    '',
    '  async function readSessionMessages(sessionID) {',
    '    if (!client || !client.session || typeof client.session.messages !== "function") return []',
    '    const result = await client.session.messages({ path: { id: sessionID } })',
    '    const messages = unwrapData(result)',
    '    return Array.isArray(messages) ? messages : []',
    '  }',
    '',
    '  async function persistSessionContext(sessionID, options = {}) {',
    '    if (!sessionID || !client || !client.session || typeof client.session.prompt !== "function") return false',
    '    const compacted = Boolean(options.compacted)',
    '    const force = Boolean(options.force)',
    "    const key = sessionID + ':' + (compacted ? 'compacted' : 'default')",
    '    if (!force && injectedSessions.has(sessionID)) return true',
    '    if (inFlightSessions.has(key)) return true',
    '',
    '    inFlightSessions.add(key)',
    '    try {',
    '      const bootstrap = buildSessionContext(projectRoot, { compacted })',
    '      if (!bootstrap) return false',
    '',
    '      if (!force) {',
    '        const messages = await readSessionMessages(sessionID)',
    '        if (messagesHaveAutomatonContext(messages)) {',
    '          injectedSessions.add(sessionID)',
    '          return true',
    '        }',
    '      }',
    '',
    '      await client.session.prompt({',
    '        path: { id: sessionID },',
    '        body: {',
    '          noReply: true,',
    "          parts: [{ type: 'text', text: bootstrap }]",
    '        }',
    '      })',
    '      injectedSessions.add(sessionID)',
    '      return true',
    '    } catch (error) {',
    "      await logPluginWarning(client, 'Failed to persist Automaton session context', error)",
    '      return false',
    '    } finally {',
    '      inFlightSessions.delete(key)',
    '    }',
    '  }',
    '',
    '  return {',
    '    event: async ({ event }) => {',
    "      if (event.type === 'session.compacted') {",
    '        const sessionID = eventSessionID(event)',
    '        if (sessionID) pendingCompactedSessions.add(sessionID)',
    '        const persisted = await persistSessionContext(sessionID, { compacted: true, force: true })',
    '        if (persisted && sessionID) {',
    '          pendingCompactedSessions.delete(sessionID)',
    '        } else {',
    '          needsCompactedInject = true',
    '        }',
    '        return',
    '      }',
    '',
    "      if (event.type === 'session.created') {",
    '        await persistSessionContext(eventSessionID(event))',
    '        return',
    '      }',
    '    },',
    "    'chat.message': async (input, output) => {",
    '      if (!input || !input.sessionID) return',
    '      if (output && Array.isArray(output.parts) && output.parts.some(isAutomatonTextPart)) return',
    '      const compacted = pendingCompactedSessions.has(input.sessionID)',
    '      const persisted = await persistSessionContext(input.sessionID, { compacted, force: compacted })',
    '      if (persisted && compacted) pendingCompactedSessions.delete(input.sessionID)',
    '    },',
    "    'experimental.chat.messages.transform': async (_input, output) => {",
    '      if (!output || !Array.isArray(output.messages) || output.messages.length === 0) return',
    '      if (messagesHaveAutomatonContext(output.messages)) return',
    "      const firstUser = output.messages.find((m) => m && m.info && m.info.role === 'user')",
    '      if (!firstUser || !Array.isArray(firstUser.parts) || firstUser.parts.length === 0) return',
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

// Render a host-native subagent definition for OpenCode. OpenCode markdown agents
// live under `.opencode/agents/` with the filename as the agent name; the body acts
// as the subagent's system prompt. Permission keys come from the current OpenCode
// docs schema (read/edit/glob/grep/list/bash/task/...). `write` is intentionally not
// a valid key — write/edit/apply_patch are gated by `edit`. Reviewer roles deny
// `edit` and `bash` so a host-side misuse cannot mutate project files even if the
// role body's no-edit intent is somehow bypassed. All roles deny `task` as the
// portable recursion guard; this is the only host where the prose guard is
// load-bearing because OpenCode subagents can be granted Task access elsewhere.
function renderOpenCodeAgentDefinition(role, roleBody) {
  const permissions = role.intent === 'review'
    ? {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        edit: 'deny',
        bash: 'deny',
        task: 'deny'
      }
    : {
        read: 'allow',
        edit: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        bash: 'allow',
        task: 'deny'
      }

  const lines = [
    '---',
    'mode: subagent',
    `description: ${role.description}`,
    'permission:'
  ]
  for (const [key, value] of Object.entries(permissions)) {
    lines.push(`  ${key}: ${value}`)
  }
  lines.push('---', '', roleBody.trim(), '')
  return lines.join('\n')
}

export const opencodeHost = {
  id: 'opencode',
  skillRoot: '.opencode/skills',
  instructionsFile: 'opencode.json',
  toolMapping: {
    subagents: 'Use the Task tool (or `@mention` where supported) to invoke `automaton-implementer`, `automaton-spec-reviewer`, or `automaton-quality-reviewer` by name. Pass the per-call dispatch packet (slice, constraints, acceptance criteria, implementation summary) as the task body; the role body is in the markdown file under `.opencode/agents/` and every Automaton subagent denies `permission.task` so it cannot fan out to another subagent.',
    wait: 'Wait for the OpenCode subagent response before dispatching dependent reviews.',
    cleanup: 'No Automaton cleanup step is required; follow OpenCode session conventions.',
    tracking: 'Use todowrite for session-local progress tracking when useful.',
    precondition: 'The primary agent\'s `permission.task` configuration must allow `automaton-implementer`, `automaton-spec-reviewer`, and `automaton-quality-reviewer` for Task-tool named-agent dispatch to work. If any of those three names is denied or filtered out, treat dispatch as unavailable and stop under SUBAGENT-PROTOCOL.md\'s "Host does not expose subagent support" condition rather than pasting a role body into a generic agent.',
    unavailable: false
  },
  installFiles() {
    return {
      '.opencode/plugins/automaton.js': renderAutomatonPlugin()
    }
  },
  agentRelativePath(role) {
    return `.opencode/agents/${role.agentName}.md`
  },
  renderAgentDefinition: renderOpenCodeAgentDefinition,
  detect(root) {
    return existsSync(join(root, '.opencode')) || existsSync(join(root, 'opencode.json'))
  }
}
