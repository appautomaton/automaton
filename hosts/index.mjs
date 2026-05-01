import { claudeHost } from './claude.mjs'
import { codexHost } from './codex.mjs'
import { opencodeHost } from './opencode.mjs'

export const HOSTS = [claudeHost, codexHost, opencodeHost]

export function detectHosts(root) {
  return HOSTS.filter((host) => host.detect(root))
}

export function getHost(id) {
  const host = HOSTS.find((candidate) => candidate.id === id)

  if (!host) {
    throw new Error(`unknown host: ${id}`)
  }

  return host
}
