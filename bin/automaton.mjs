#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { existsSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { installHosts, installProject, uninstallHosts, uninstallProject } from '../lib/install.mjs'
import { automatonPaths } from '../lib/paths.mjs'
import { contextSummary } from '../lib/retrieval.mjs'
import { readStatusPointer, statusPointerConflict } from '../lib/status.mjs'
import { loadCurrentState } from '../lib/state.mjs'
import { HOSTS } from '../hosts/index.mjs'

export function buildCli() {
  return {
    commands: ['install', 'context', 'status']
  }
}

export { contextSummary }

export function statusSummary(state, conflict = null) {
  const lines = [`active change: ${state.activeChange}`, `stage: ${state.stage}`]

  if (conflict !== null) {
    lines.push(
      `status file mismatch: STATUS.md says active change: ${conflict.status.activeChange}, stage: ${conflict.status.stage}`
    )
  }

  return lines.join('\n')
}

function parseInstallArgs(argv) {
  const selectedHosts = new Set()
  let root = '.'
  let rootSeen = false
  let uninstall = false
  let all = false

  for (const arg of argv) {
    if (arg === '--uninstall') {
      uninstall = true
      continue
    }

    if (arg === '--all') {
      all = true
      continue
    }

    if (arg === '--claude' || arg === '--codex' || arg === '--opencode') {
      selectedHosts.add(arg.slice(2))
      continue
    }

    if (arg.startsWith('--')) {
      throw new Error(`unknown install flag: ${arg}`)
    }

    if (rootSeen) {
      throw new Error('install accepts at most one root path')
    }

    root = arg
    rootSeen = true
  }

  const hosts = all ? HOSTS : HOSTS.filter((host) => selectedHosts.has(host.id))

  return {
    root,
    uninstall,
    all,
    hasHostSelection: all || selectedHosts.size > 0,
    hosts
  }
}

function run(argv) {
  const [command, ...rest] = argv

  if (command === 'context') {
    console.log(contextSummary(rest[0] ?? 'frame'))
    return
  }

  if (command === 'status') {
    const root = rest[0] ?? '.'
    const paths = automatonPaths(root)
    const currentPath = join(paths.runtimeRoot, 'state', 'current.json')
    const statusPath = join(paths.steeringRoot, 'STATUS.md')
    if (!existsSync(currentPath)) {
      console.log('active change: none\nstage: none')
      return
    }
    const currentState = loadCurrentState(currentPath)
    console.log(statusSummary(currentState, statusPointerConflict(currentState, readStatusPointer(statusPath))))
    return
  }

  if (command === 'install') {
    const options = parseInstallArgs(rest)
    const sourceRoot = fileURLToPath(new URL('..', import.meta.url))

    if (options.uninstall) {
      const hosts = options.hasHostSelection ? options.hosts : HOSTS
      const removed = []

      removed.push(...uninstallHosts(hosts, { root: options.root, sourceRoot }))

      if (!options.hasHostSelection || options.all) {
        removed.push(uninstallProject(options.root))
      }

      console.log(removed.map((entry) => entry.id).join('\n'))
      return
    }

    const installed = [installProject(options.root, { sourceRoot }), ...installHosts(options.hosts, { root: options.root, sourceRoot })]

    console.log(installed.map((entry) => entry.id).join('\n'))
    return
  }

  console.log(buildCli().commands.join('\n'))
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))) {
  run(process.argv.slice(2))
}
