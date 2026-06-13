#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { installHosts, installProject, uninstallHosts, uninstallProject } from '../lib/install.mjs'
import { automatonPaths } from '../lib/paths.mjs'
import { loadReceipt, receiptOwners } from '../lib/receipt.mjs'
import { contextSummary } from '../lib/retrieval.mjs'
import { loadCurrentState, normalizeCurrentState } from '../lib/state.mjs'
import { validateHandoff } from '../lib/validate.mjs'
import { HOSTS } from '../hosts/index.mjs'

function diagnostic(level, code, message) {
  return { level, code, message }
}

export function buildCli() {
  return {
    commands: ['install', 'context', 'status', 'validate']
  }
}

export { contextSummary }

export function statusSummary(state) {
  return [`active change: ${state.activeChange}`, `stage: ${state.stage}`].join('\n')
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

function printWarnings(results) {
  const seen = new Set()
  for (const result of results) {
    for (const warning of result.warnings ?? []) {
      if (seen.has(warning.message)) {
        continue
      }
      seen.add(warning.message)
      console.error(`warning: ${warning.message}`)
    }
  }
}

// True when the install receipt shows no host installation left after this
// uninstall, so the shared `.agent` runtime no longer serves anything.
function noHostsRemain(root) {
  const receipt = loadReceipt(root)
  if (!receipt) {
    return false
  }
  const owners = receiptOwners(receipt)
  return !HOSTS.some((host) => owners.has(host.id))
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
    if (!existsSync(currentPath)) {
      console.log('active change: none\nstage: none')
      return
    }
    const currentState = loadCurrentState(currentPath)
    console.log(statusSummary(currentState))
    return
  }

  if (command === 'validate') {
    const root = rest[0] ?? '.'
    const paths = automatonPaths(root)
    const currentPath = join(paths.runtimeRoot, 'state', 'current.json')

    if (!existsSync(currentPath)) {
      console.log(JSON.stringify({
        valid: false,
        diagnostics: [diagnostic('error', 'no_state', 'current.json does not exist')]
      }, null, 2))
      process.exitCode = 1
      return
    }

    let parsed
    try {
      parsed = JSON.parse(readFileSync(currentPath, 'utf8'))
    } catch (err) {
      console.log(JSON.stringify({
        valid: false,
        diagnostics: [diagnostic('error', 'invalid_state_json', `current.json is not valid JSON: ${err.message}`)]
      }, null, 2))
      process.exitCode = 1
      return
    }

    const state = normalizeCurrentState(parsed)
    const result = validateHandoff(state, paths.root)
    console.log(JSON.stringify(result, null, 2))
    if (!result.valid) process.exitCode = 1
    return
  }

  if (command === 'install') {
    const options = parseInstallArgs(rest)
    const sourceRoot = fileURLToPath(new URL('..', import.meta.url))

    if (options.uninstall) {
      const hosts = options.hasHostSelection ? options.hosts : HOSTS
      const removed = []

      removed.push(...uninstallHosts(hosts, { root: options.root, sourceRoot }))

      // A host-scoped uninstall still removes the shared runtime when it took
      // out the last installed host: machinery with no host serves nothing,
      // while `.agent` project history is preserved either way.
      if (!options.hasHostSelection || options.all || noHostsRemain(options.root)) {
        removed.push(uninstallProject(options.root))
      }

      console.log(removed.map((entry) => entry.id).join('\n'))
      printWarnings(removed)
      return
    }

    const installed = [installProject(options.root, { sourceRoot }), ...installHosts(options.hosts, { root: options.root, sourceRoot })]

    console.log(installed.map((entry) => entry.id).join('\n'))
    printWarnings(installed)
    return
  }

  console.log(buildCli().commands.join('\n'))
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))) {
  run(process.argv.slice(2))
}
