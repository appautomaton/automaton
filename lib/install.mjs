import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { automatonPaths } from './paths.mjs'
import { scaffoldProject } from './scaffold.mjs'
import { saveCurrentState } from './state.mjs'

const CODEX_HOOKS_FEATURE_LINE = 'hooks = true'
const LEGACY_CODEX_HOOKS_FEATURE_LINE = 'codex_hooks = true'
const CODEX_MULTI_AGENT_FEATURE_LINE = 'multi_agent = true'
const CODEX_FEATURE_LINES = [CODEX_HOOKS_FEATURE_LINE, CODEX_MULTI_AGENT_FEATURE_LINE]
const GENERATED_CODEX_CONFIG = `[features]\n${CODEX_FEATURE_LINES.join('\n')}\n`
const CODEX_HOOK_FRAGMENT_PATTERN = /\.codex\/hooks\/[A-Za-z0-9._-]+\.mjs/g
const CLAUDE_HOOK_FRAGMENT_PATTERN = /\.claude\/hooks\/[A-Za-z0-9._-]+\.mjs/g

function renderHostToolsReference(host) {
  const mapping = host.toolMapping ?? {}
  const lines = [
    '# Host Tools',
    '',
    `Host: \`${host.id}\``,
    '',
    'Use this file when an Automaton skill asks for host-native collaboration or coordination tools.',
    '',
    '## Subagents',
    '',
    `- availability: ${mapping.unavailable ? 'unavailable' : 'available'}`,
    `- dispatch: ${mapping.subagents ?? 'No host-specific subagent mapping has been defined.'}`,
    `- wait: ${mapping.wait ?? 'Use the host default completion behavior.'}`,
    `- cleanup: ${mapping.cleanup ?? 'No host-specific cleanup guidance.'}`,
    `- tracking: ${mapping.tracking ?? 'Use the host default task tracking behavior.'}`
  ]

  if (mapping.configuration) {
    lines.push(`- configuration: ${mapping.configuration}`)
  }

  lines.push(
    '',
    '## Rules',
    '',
    '- Follow the skill protocol first; this file only maps host tool names.',
    '- Do not invent a universal SDK or CLI when the host has native subagent tools.',
    '- If a required host capability is unavailable, stop and recommend the non-subagent fallback skill.',
    ''
  )

  return lines.join('\n')
}

function hostRoot(root, host) {
  return join(root, host.skillRoot.split('/')[0])
}

function writeFile(target, content) {
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content, 'utf8')
}

function copyTreeSkippingDirectories(sourceRoot, targetRoot, skippedDirectories = new Set()) {
  mkdirSync(targetRoot, { recursive: true })

  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (skippedDirectories.has(entry.name)) {
      continue
    }

    const sourcePath = join(sourceRoot, entry.name)
    const targetPath = join(targetRoot, entry.name)

    if (entry.isDirectory()) {
      copyTreeSkippingDirectories(sourcePath, targetPath, skippedDirectories)
      continue
    }

    mkdirSync(dirname(targetPath), { recursive: true })
    cpSync(sourcePath, targetPath)
  }
}

function replaceOptionalTree(sourceRoot, targetRoot) {
  rmSync(targetRoot, { recursive: true, force: true })

  if (!existsSync(sourceRoot)) {
    return
  }

  copyTreeSkippingDirectories(sourceRoot, targetRoot)
}

function pruneEmptyDirectories(target, stopAt) {
  let current = target

  while (current.startsWith(stopAt) && current !== stopAt && existsSync(current)) {
    if (readdirSync(current).length > 0) {
      return
    }

    rmSync(current, { recursive: true, force: true })
    current = dirname(current)
  }
}

function removeInstallManifest(root) {
  rmSync(join(automatonPaths(root).runtimeRoot, 'state', 'install-manifest.json'), { force: true })
}

function sourceSkillNames(sourceRoot) {
  return readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== '_shared')
}

function removeSkillDirectories(targetRoot, skillNames) {
  if (!existsSync(targetRoot)) {
    return
  }

  for (const skillName of skillNames) {
    rmSync(join(targetRoot, skillName), { recursive: true, force: true })
  }
}

function syncHostSkills(sourceRoot, targetRoot) {
  mkdirSync(targetRoot, { recursive: true })
  const skillNames = sourceSkillNames(sourceRoot)
  removeSkillDirectories(targetRoot, skillNames)

  for (const skillName of skillNames) {
    copyTreeSkippingDirectories(
      join(sourceRoot, skillName),
      join(targetRoot, skillName),
      new Set(['scripts'])
    )
  }
}

function ensureCodexFeaturesEnabled(target) {
  if (!existsSync(target)) {
    writeFile(target, GENERATED_CODEX_CONFIG)
    return
  }

  let current = readFileSync(target, 'utf8')
  const original = current
  current = current.replace(new RegExp(`^\\s*${LEGACY_CODEX_HOOKS_FEATURE_LINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n?`, 'm'), '')
  const missingFeatureLines = CODEX_FEATURE_LINES.filter((line) => !current.includes(line))

  if (missingFeatureLines.length === 0) {
    if (current !== original) {
      writeFileSync(target, current, 'utf8')
    }
    return
  }

  if (current.includes('[features]')) {
    writeFileSync(target, current.replace('[features]', `[features]\n${missingFeatureLines.join('\n')}`), 'utf8')
    return
  }

  const prefix = current.endsWith('\n') ? current : `${current}\n`
  writeFileSync(target, `${prefix}\n[features]\n${missingFeatureLines.join('\n')}\n`, 'utf8')
}

function hookFragments(group, pattern) {
  if (!Array.isArray(group?.hooks)) {
    return []
  }

  return group.hooks.flatMap((hook) => {
    if (hook?.type !== 'command' || typeof hook.command !== 'string') {
      return []
    }
    return [...hook.command.matchAll(pattern)].map((match) => match[0])
  })
}

function hookTargetsAny(hook, fragments, pattern) {
  if (hook?.type !== 'command' || typeof hook.command !== 'string') {
    return false
  }

  return [...hook.command.matchAll(pattern)].some((match) => fragments.has(match[0]))
}

function removeTargetedHookEntries(group, fragments, pattern) {
  if (!Array.isArray(group?.hooks)) {
    return { group, changed: false }
  }

  const hooks = group.hooks.filter((hook) => !hookTargetsAny(hook, fragments, pattern))

  if (hooks.length === group.hooks.length) {
    return { group, changed: false }
  }

  if (hooks.length === 0) {
    return { group: null, changed: true }
  }

  return { group: { ...group, hooks }, changed: true }
}

function removeTargetedHookGroups(groups, fragments, pattern) {
  let changed = false
  const nextGroups = []

  for (const group of groups) {
    const result = removeTargetedHookEntries(group, fragments, pattern)
    changed = changed || result.changed

    if (result.group !== null) {
      nextGroups.push(result.group)
    }
  }

  return { groups: nextGroups, changed }
}

function ensureHookConfig(target, desiredContent, pattern) {
  const desired = JSON.parse(desiredContent)

  if (!existsSync(target)) {
    writeFile(target, desiredContent)
    return
  }

  const current = JSON.parse(readFileSync(target, 'utf8'))
  let changed = false

  current.hooks ??= {}

  for (const [eventName, desiredGroups] of Object.entries(desired.hooks ?? {})) {
    const desiredFragments = new Set(desiredGroups.flatMap((group) => hookFragments(group, pattern)))
    const currentGroups = Array.isArray(current.hooks[eventName]) ? current.hooks[eventName] : []
    const removed = removeTargetedHookGroups(currentGroups, desiredFragments, pattern)
    const nextGroups = removed.groups

    changed = changed || removed.changed

    for (const desiredGroup of desiredGroups) {
      const groupKey = JSON.stringify(desiredGroup)

      if (nextGroups.some((group) => JSON.stringify(group) === groupKey)) {
        continue
      }

      nextGroups.push(desiredGroup)
      changed = true
    }

    current.hooks[eventName] = nextGroups
  }

  if (!changed) {
    return
  }

  writeFileSync(target, JSON.stringify(current, null, 2) + '\n', 'utf8')
}

function ensureCodexHooksConfigured(target, desiredContent) {
  ensureHookConfig(target, desiredContent, CODEX_HOOK_FRAGMENT_PATTERN)
}

function ensureClaudeHooksConfigured(target, desiredContent) {
  ensureHookConfig(target, desiredContent, CLAUDE_HOOK_FRAGMENT_PATTERN)
}

function cleanupCodexConfig(target) {
  if (!existsSync(target)) {
    return
  }

  let current = readFileSync(target, 'utf8')

  for (const featureLine of [CODEX_HOOKS_FEATURE_LINE, LEGACY_CODEX_HOOKS_FEATURE_LINE]) {
    current = current.replace(new RegExp(`^\\s*${featureLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n?`, 'm'), '')
  }
  current = current.replace(/\n?\[features\]\n(?=(?:\s*\n)*(?:\[|$))/g, '\n')
  current = current.replace(/\n{3,}/g, '\n\n').trim()

  if (!current) {
    rmSync(target, { force: true })
    return
  }

  writeFileSync(target, `${current}\n`, 'utf8')
}

function disableHookConfig(target, desiredContent, pattern) {
  if (!existsSync(target)) {
    return
  }

  const desired = JSON.parse(desiredContent)
  const current = JSON.parse(readFileSync(target, 'utf8'))

  if (!current.hooks) {
    return
  }

  let changed = false

  for (const [eventName, desiredGroups] of Object.entries(desired.hooks ?? {})) {
    const currentGroups = current.hooks[eventName]

    if (!Array.isArray(currentGroups)) {
      continue
    }

    const desiredFragments = new Set(desiredGroups.flatMap((group) => hookFragments(group, pattern)))
    const removed = removeTargetedHookGroups(currentGroups, desiredFragments, pattern)
    changed = changed || removed.changed

    if (removed.groups.length === 0) {
      delete current.hooks[eventName]
      continue
    }

    current.hooks[eventName] = removed.groups
  }

  if (Object.keys(current.hooks).length === 0) {
    delete current.hooks
  }

  if (!changed) {
    return
  }

  if (Object.keys(current).length === 0) {
    rmSync(target, { force: true })
    return
  }

  writeFileSync(target, JSON.stringify(current, null, 2) + '\n', 'utf8')
}

function disableCodexHooks(target, desiredContent) {
  disableHookConfig(target, desiredContent, CODEX_HOOK_FRAGMENT_PATTERN)
}

function disableClaudeHooks(target, desiredContent) {
  disableHookConfig(target, desiredContent, CLAUDE_HOOK_FRAGMENT_PATTERN)
}

export function installProject(root = '.', { sourceRoot } = {}) {
  const paths = scaffoldProject(root)
  const currentPath = join(paths.runtimeRoot, 'state', 'current.json')
  removeInstallManifest(paths.root)

  if (sourceRoot) {
    replaceOptionalTree(join(sourceRoot, 'runtime', 'bin'), join(paths.runtimeRoot, 'bin'))
    replaceOptionalTree(join(sourceRoot, 'runtime', 'lib'), join(paths.runtimeRoot, 'lib'))
    replaceOptionalTree(join(sourceRoot, 'skills', '_shared', 'references'), paths.sharedReferencesRoot)
    replaceOptionalTree(join(sourceRoot, 'skills', '_shared', 'scripts'), paths.sharedScriptsRoot)
  }

  if (!existsSync(currentPath)) {
    saveCurrentState(currentPath, {
      activeChange: 'bootstrap',
      stage: 'frame'
    })
  }

  return {
    id: 'agent',
    root: paths.root,
    agentRoot: paths.agentRoot,
    runtimeRoot: paths.runtimeRoot,
    currentPath
  }
}

export function uninstallProject(root = '.') {
  const paths = automatonPaths(root)

  rmSync(paths.runtimeRoot, { recursive: true, force: true })
  pruneEmptyDirectories(dirname(paths.runtimeRoot), paths.agentRoot)

  return {
    id: 'agent',
    root: paths.root,
    agentRoot: paths.agentRoot,
    runtimeRoot: paths.runtimeRoot
  }
}

export function installHost(host, { root = '.', sourceRoot }) {
  if (!sourceRoot) {
    throw new Error('missing install source root')
  }

  const project = installProject(root, { sourceRoot })
  const paths = automatonPaths(project.root)
  const projectSkillRoot = join(paths.root, host.skillRoot)
  syncHostSkills(join(sourceRoot, 'skills'), projectSkillRoot)

  // HOST-TOOLS.md is read only by auto-execute (the sole dispatching skill), so generate one copy
  // there rather than scattering an identical file into every skill's references/.
  const hostToolsTarget = join(projectSkillRoot, 'auto-execute', 'references', 'HOST-TOOLS.md')
  writeFile(hostToolsTarget, renderHostToolsReference(host))

  const installFiles = host.installFiles?.({ root: paths.root }) ?? {}
  for (const [relativePath, content] of Object.entries(installFiles)) {
    const target = join(paths.root, relativePath)

    if (relativePath === '.codex/config.toml') {
      ensureCodexFeaturesEnabled(target)
      continue
    }

    if (relativePath === '.codex/hooks.json') {
      ensureCodexHooksConfigured(target, content)
      continue
    }

    if (relativePath === '.claude/settings.json') {
      ensureClaudeHooksConfigured(target, content)
      continue
    }

    writeFile(target, content)
  }

  return {
    id: host.id,
    root: paths.root,
    agentRoot: paths.agentRoot,
    skillRoot: projectSkillRoot
  }
}

export function uninstallHost(host, { root = '.', sourceRoot }) {
  if (!sourceRoot) {
    throw new Error('missing install source root')
  }

  const paths = automatonPaths(root)
  const projectSkillRoot = join(paths.root, host.skillRoot)
  const hostRootPath = hostRoot(paths.root, host)

  removeSkillDirectories(projectSkillRoot, sourceSkillNames(join(sourceRoot, 'skills')))

  const installFiles = host.installFiles?.({ root: paths.root }) ?? {}
  for (const [relativePath, content] of Object.entries(installFiles)) {
    const target = join(paths.root, relativePath)

    if (relativePath === '.codex/config.toml') {
      cleanupCodexConfig(target)
      pruneEmptyDirectories(dirname(target), join(paths.root, '.codex'))
      continue
    }

    if (relativePath === '.codex/hooks.json') {
      disableCodexHooks(target, content)
      pruneEmptyDirectories(dirname(target), join(paths.root, '.codex'))
      continue
    }

    if (relativePath === '.claude/settings.json') {
      disableClaudeHooks(target, content)
      pruneEmptyDirectories(dirname(target), join(paths.root, '.claude'))
      continue
    }

    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), hostRootPath)
  }

  pruneEmptyDirectories(projectSkillRoot, hostRootPath)
  removeInstallManifest(paths.root)

  return {
    id: host.id,
    root: paths.root,
    agentRoot: paths.agentRoot,
    skillRoot: projectSkillRoot
  }
}

export function installHosts(hosts, options) {
  return hosts.map((host) => installHost(host, options))
}

export function uninstallHosts(hosts, options) {
  return hosts.map((host) => uninstallHost(host, options))
}
