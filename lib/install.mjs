import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import { automatonPaths } from './paths.mjs'
import { scaffoldProject } from './scaffold.mjs'
import { saveCurrentState } from './state.mjs'

const MANIFEST_FILE = 'install-manifest.json'
const LEGACY_STAGE_SKILL_NAMES = ['frame', 'plan', 'execute', 'verify', 'resume']
const REMOVED_SKILL_NAMES = ['auto-execute-subagent']
const REMOVED_PROJECT_FILES = [
  '.agent/.automaton/bin/sync-status-pointer.mjs',
  '.agent/.automaton/bin/sync-status.mjs',
  '.agent/.automaton/bin/update-state.mjs'
]
const REMOVED_HOST_SCRIPT_NAMES = ['scaffold-agent.mjs']
const REMOVED_HOST_FILES = {
  claude: ['.claude/hooks/stop.mjs'],
  codex: ['.codex/hooks/stop.mjs']
}
const REMOVED_CLAUDE_HOOK_FRAGMENTS = ['.claude/hooks/stop.mjs']

const CODEX_HOOKS_FEATURE_LINE = 'hooks = true'
const LEGACY_CODEX_HOOKS_FEATURE_LINE = 'codex_hooks = true'
const CODEX_MULTI_AGENT_FEATURE_LINE = 'multi_agent = true'
const CODEX_FEATURE_LINES = [CODEX_HOOKS_FEATURE_LINE, CODEX_MULTI_AGENT_FEATURE_LINE]

function emptyManifest() {
  return {
    project: {
      files: []
    },
    hosts: {}
  }
}

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

function manifestPath(root) {
  return join(automatonPaths(root).runtimeRoot, 'state', MANIFEST_FILE)
}

function normalizeManifest(manifest) {
  const normalized = emptyManifest()

  if (Array.isArray(manifest?.project?.files)) {
    normalized.project.files = [...new Set(manifest.project.files)]
  }

  for (const [hostId, entry] of Object.entries(manifest?.hosts ?? {})) {
    normalized.hosts[hostId] = {
      files: Array.isArray(entry?.files) ? [...new Set(entry.files)] : [],
      mutations: {
        codexHooksInjected: Boolean(entry?.mutations?.codexHooksInjected),
        codexMultiAgentInjected: Boolean(entry?.mutations?.codexMultiAgentInjected),
        claudeHooksInjected: Boolean(entry?.mutations?.claudeHooksInjected)
      }
    }
  }

  return normalized
}

function loadManifest(root) {
  const target = manifestPath(root)

  if (!existsSync(target)) {
    return emptyManifest()
  }

  return normalizeManifest(JSON.parse(readFileSync(target, 'utf8')))
}

function saveManifest(root, manifest) {
  const target = manifestPath(root)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, JSON.stringify(normalizeManifest(manifest), null, 2) + '\n', 'utf8')
}

function deleteManifest(root) {
  rmSync(manifestPath(root), { force: true })
}

function rememberProjectFiles(root, files) {
  if (files.length === 0) {
    return
  }

  const manifest = loadManifest(root)
  manifest.project.files = [...new Set([...manifest.project.files, ...files])]
  saveManifest(root, manifest)
}

function rememberHostInstall(root, hostId, files, mutations = {}) {
  const manifest = loadManifest(root)
  const current = manifest.hosts[hostId] ?? { files: [], mutations: {} }

  manifest.hosts[hostId] = {
    files: [...new Set([...current.files, ...files])],
    mutations: {
      codexHooksInjected: Boolean(current.mutations?.codexHooksInjected || mutations.codexHooksInjected),
      codexMultiAgentInjected: Boolean(current.mutations?.codexMultiAgentInjected || mutations.codexMultiAgentInjected),
      claudeHooksInjected: Boolean(current.mutations?.claudeHooksInjected || mutations.claudeHooksInjected)
    }
  }

  saveManifest(root, manifest)
}

function forgetProject(root) {
  const manifest = loadManifest(root)
  manifest.project.files = []

  if (Object.keys(manifest.hosts).length === 0) {
    deleteManifest(root)
    return
  }

  saveManifest(root, manifest)
}

function forgetHost(root, hostId) {
  const manifest = loadManifest(root)
  delete manifest.hosts[hostId]

  if (manifest.project.files.length === 0 && Object.keys(manifest.hosts).length === 0) {
    deleteManifest(root)
    return
  }

  saveManifest(root, manifest)
}

function managedFiles(root, files) {
  return files.map((file) => relative(root, file))
}

function hostRoot(root, host) {
  return join(root, host.skillRoot.split('/')[0])
}

function managedRootForRelativePath(root, relativePath) {
  return join(root, relativePath.split('/')[0])
}

function seedFile(target, content, options = {}) {
  const { root, managedPaths } = options
  mkdirSync(dirname(target), { recursive: true })
  const shouldRefresh = root !== undefined && managedPaths?.has(relative(root, target))
  const existed = existsSync(target)

  if (!existed || shouldRefresh) {
    writeFileSync(target, content, 'utf8')
    return !existed
  }

  return false
}

function seedTree(sourceRoot, targetRoot, options = {}) {
  const { root, managedPaths, skipDirectories = [] } = options
  const skippedDirectories = new Set(skipDirectories)
  const createdFiles = []
  mkdirSync(targetRoot, { recursive: true })

  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourcePath = join(sourceRoot, entry.name)
    const targetPath = join(targetRoot, entry.name)

    if (entry.name === '_shared') {
      // _shared/ is repo-only source of truth; never installed into host trees
      continue
    }

    if (entry.isDirectory()) {
      if (skippedDirectories.has(entry.name)) {
        continue
      }
      createdFiles.push(...seedTree(sourcePath, targetPath, options))
      continue
    }

    const shouldRefresh = root !== undefined && managedPaths?.has(relative(root, targetPath))

    if (!existsSync(targetPath) || shouldRefresh) {
      const existed = existsSync(targetPath)
      mkdirSync(dirname(targetPath), { recursive: true })
      cpSync(sourcePath, targetPath)
      if (!existed) {
        createdFiles.push(targetPath)
      }
    }
  }

  return createdFiles
}

function syncTree(sourceRoot, targetRoot) {
  const createdFiles = []
  mkdirSync(targetRoot, { recursive: true })

  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourcePath = join(sourceRoot, entry.name)
    const targetPath = join(targetRoot, entry.name)

    if (entry.isDirectory()) {
      createdFiles.push(...syncTree(sourcePath, targetPath))
      continue
    }

    const existed = existsSync(targetPath)
    mkdirSync(dirname(targetPath), { recursive: true })
    cpSync(sourcePath, targetPath)
    if (!existed) {
      createdFiles.push(targetPath)
    }
  }

  return createdFiles
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

function migrateLegacyHostFiles(root, host) {
  const legacySkillRoots = host.legacySkillRoots ?? []

  if (legacySkillRoots.length === 0) {
    return
  }

  const manifest = loadManifest(root)
  const hostEntry = manifest.hosts[host.id]

  if (!hostEntry) {
    return
  }

  let changed = false
  const retainedFiles = []
  const touchedRoots = new Set()

  for (const relativePath of hostEntry.files) {
    const legacyRoot = legacySkillRoots.find(
      (candidate) => relativePath === candidate || relativePath.startsWith(`${candidate}/`)
    )

    if (!legacyRoot) {
      retainedFiles.push(relativePath)
      continue
    }

    changed = true
    touchedRoots.add(managedRootForRelativePath(root, legacyRoot))
    const target = join(root, relativePath)
    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), managedRootForRelativePath(root, legacyRoot))
  }

  if (!changed) {
    return
  }

  manifest.hosts[host.id] = {
    ...hostEntry,
    files: retainedFiles
  }
  saveManifest(root, manifest)

  for (const touchedRoot of touchedRoots) {
    if (existsSync(touchedRoot) && readdirSync(touchedRoot).length === 0) {
      rmSync(touchedRoot, { recursive: true, force: true })
    }
  }
}

function migrateLegacySkillNames(root, host) {
  const manifest = loadManifest(root)
  const hostEntry = manifest.hosts[host.id]

  if (!hostEntry) {
    return
  }

  let changed = false
  const retainedFiles = []

  for (const relativePath of hostEntry.files) {
    const isLegacySkillPath = LEGACY_STAGE_SKILL_NAMES.some(
      (skillName) => relativePath.startsWith(`${host.skillRoot}/${skillName}/`)
    )

    if (!isLegacySkillPath) {
      retainedFiles.push(relativePath)
      continue
    }

    changed = true
    const target = join(root, relativePath)
    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), hostRoot(root, host))
  }

  if (!changed) {
    return
  }

  manifest.hosts[host.id] = {
    ...hostEntry,
    files: retainedFiles
  }
  saveManifest(root, manifest)
}

function removeManifestOwnedRemovedSkills(root, host) {
  const manifest = loadManifest(root)
  const hostEntry = manifest.hosts[host.id]

  if (!hostEntry) {
    return
  }

  let changed = false
  const retainedFiles = []

  for (const relativePath of hostEntry.files) {
    const isRemovedSkillPath = REMOVED_SKILL_NAMES.some(
      (skillName) => relativePath === `${host.skillRoot}/${skillName}` || relativePath.startsWith(`${host.skillRoot}/${skillName}/`)
    )

    if (!isRemovedSkillPath) {
      retainedFiles.push(relativePath)
      continue
    }

    changed = true
    const target = join(root, relativePath)
    rmSync(target, { recursive: true, force: true })
    pruneEmptyDirectories(dirname(target), hostRoot(root, host))
  }

  if (!changed) {
    return
  }

  manifest.hosts[host.id] = {
    ...hostEntry,
    files: retainedFiles
  }
  saveManifest(root, manifest)
}

function removeManifestOwnedRemovedProjectFiles(root) {
  const manifest = loadManifest(root)
  const removed = new Set(REMOVED_PROJECT_FILES)
  let changed = false
  const retainedFiles = []

  for (const relativePath of manifest.project.files) {
    if (!removed.has(relativePath)) {
      retainedFiles.push(relativePath)
      continue
    }

    changed = true
    const target = join(root, relativePath)
    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), join(root, '.agent', '.automaton'))
  }

  if (!changed) {
    return
  }

  manifest.project.files = retainedFiles
  saveManifest(root, manifest)
}

function removeManifestOwnedSharedReferences(root, host, sharedRefsRoot) {
  const manifest = loadManifest(root)
  const hostEntry = manifest.hosts[host.id]

  if (!hostEntry || !existsSync(sharedRefsRoot)) {
    return
  }

  const sharedReferenceNames = new Set(
    readdirSync(sharedRefsRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
  )
  let changed = false
  const retainedFiles = []

  for (const relativePath of hostEntry.files) {
    const isSharedReference = relativePath.startsWith(host.skillRoot + '/') &&
      relativePath.includes('/references/') &&
      sharedReferenceNames.has(relativePath.split('/').pop())

    if (!isSharedReference) {
      retainedFiles.push(relativePath)
      continue
    }

    changed = true
    const target = join(root, relativePath)
    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), hostRoot(root, host))
  }

  if (!changed) {
    return
  }

  manifest.hosts[host.id] = {
    ...hostEntry,
    files: retainedFiles
  }
  saveManifest(root, manifest)
}

function removeManifestOwnedSharedScripts(root, host, sharedScriptsRoot) {
  const manifest = loadManifest(root)
  const hostEntry = manifest.hosts[host.id]

  if (!hostEntry || !existsSync(sharedScriptsRoot)) {
    return
  }

  const sharedScriptNames = new Set(
    readdirSync(sharedScriptsRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
  )
  let changed = false
  const retainedFiles = []

  for (const relativePath of hostEntry.files) {
    const isSharedScript = relativePath.startsWith(host.skillRoot + '/') &&
      relativePath.includes('/scripts/') &&
      sharedScriptNames.has(relativePath.split('/').pop())

    if (!isSharedScript) {
      retainedFiles.push(relativePath)
      continue
    }

    changed = true
    const target = join(root, relativePath)
    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), hostRoot(root, host))
  }

  if (!changed) {
    return
  }

  manifest.hosts[host.id] = {
    ...hostEntry,
    files: retainedFiles
  }
  saveManifest(root, manifest)
}

function removeManifestOwnedRemovedHostScripts(root, host) {
  const manifest = loadManifest(root)
  const hostEntry = manifest.hosts[host.id]

  if (!hostEntry) {
    return
  }

  const removedScriptNames = new Set(REMOVED_HOST_SCRIPT_NAMES)
  let changed = false
  const retainedFiles = []

  for (const relativePath of hostEntry.files) {
    const isRemovedHostScript = relativePath.startsWith(host.skillRoot + '/') &&
      relativePath.includes('/scripts/') &&
      removedScriptNames.has(relativePath.split('/').pop())

    if (!isRemovedHostScript) {
      retainedFiles.push(relativePath)
      continue
    }

    changed = true
    const target = join(root, relativePath)
    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), hostRoot(root, host))
  }

  if (!changed) {
    return
  }

  manifest.hosts[host.id] = {
    ...hostEntry,
    files: retainedFiles
  }
  saveManifest(root, manifest)
}

function removeManifestOwnedRemovedHostFiles(root, host) {
  const removedFiles = REMOVED_HOST_FILES[host.id] ?? []

  if (removedFiles.length === 0) {
    return
  }

  const manifest = loadManifest(root)
  const hostEntry = manifest.hosts[host.id]

  if (!hostEntry) {
    return
  }

  const removed = new Set(removedFiles)
  let changed = false
  const retainedFiles = []

  for (const relativePath of hostEntry.files) {
    if (!removed.has(relativePath)) {
      retainedFiles.push(relativePath)
      continue
    }

    changed = true
    const target = join(root, relativePath)
    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), hostRoot(root, host))
  }

  if (!changed) {
    return
  }

  manifest.hosts[host.id] = {
    ...hostEntry,
    files: retainedFiles
  }
  saveManifest(root, manifest)
}

function ensureCodexFeaturesEnabled(target) {
  if (!existsSync(target)) {
    seedFile(target, `[features]\n${CODEX_FEATURE_LINES.join('\n')}\n`)
    return { created: true, injected: false, injectedFeatures: [] }
  }

  let current = readFileSync(target, 'utf8')
  const original = current
  current = current.replace(new RegExp(`^\\s*${LEGACY_CODEX_HOOKS_FEATURE_LINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n?`, 'm'), '')
  const missingFeatureLines = CODEX_FEATURE_LINES.filter((line) => !current.includes(line))

  if (missingFeatureLines.length === 0) {
    if (current !== original) {
      writeFileSync(target, current, 'utf8')
      return { created: false, injected: true, injectedFeatures: [] }
    }
    return { created: false, injected: false, injectedFeatures: [] }
  }

  if (current.includes('[features]')) {
    writeFileSync(target, current.replace('[features]', `[features]\n${missingFeatureLines.join('\n')}`), 'utf8')
    return { created: false, injected: true, injectedFeatures: missingFeatureLines }
  }

  const prefix = current.endsWith('\n') ? current : `${current}\n`
  writeFileSync(target, `${prefix}\n[features]\n${missingFeatureLines.join('\n')}\n`, 'utf8')
  return { created: false, injected: true, injectedFeatures: missingFeatureLines }
}

function claudeHookFragments(group) {
  if (!Array.isArray(group?.hooks)) {
    return []
  }

  return group.hooks.flatMap((hook) => {
    if (hook?.type !== 'command' || typeof hook.command !== 'string') {
      return []
    }
    return [...hook.command.matchAll(/\.claude\/hooks\/[A-Za-z0-9._-]+\.mjs/g)].map((match) => match[0])
  })
}

function claudeHookGroupTargetsAny(group, fragments) {
  const groupFragments = claudeHookFragments(group)
  return groupFragments.some((fragment) => fragments.has(fragment))
}

function ensureClaudeHooksConfigured(target, desiredContent) {
  const desired = JSON.parse(desiredContent)

  if (!existsSync(target)) {
    seedFile(target, desiredContent)
    return { created: true, injected: false }
  }

  const current = JSON.parse(readFileSync(target, 'utf8'))
  let changed = false

  current.hooks ??= {}

  for (const [eventName, currentGroups] of Object.entries(current.hooks)) {
    if (!Array.isArray(currentGroups)) {
      continue
    }

    const removedFragments = new Set(REMOVED_CLAUDE_HOOK_FRAGMENTS)
    const nextGroups = currentGroups.filter((group) => !claudeHookGroupTargetsAny(group, removedFragments))

    if (nextGroups.length !== currentGroups.length) {
      changed = true
    }

    if (nextGroups.length === 0) {
      delete current.hooks[eventName]
      continue
    }

    current.hooks[eventName] = nextGroups
  }

  for (const [eventName, desiredGroups] of Object.entries(desired.hooks ?? {})) {
    const desiredFragments = new Set(desiredGroups.flatMap(claudeHookFragments))
    const currentGroups = (current.hooks[eventName] ?? [])
      .filter((group) => !claudeHookGroupTargetsAny(group, desiredFragments))

    if (currentGroups.length !== (current.hooks[eventName] ?? []).length) {
      changed = true
    }

    for (const desiredGroup of desiredGroups) {
      const groupKey = JSON.stringify(desiredGroup)

      if (currentGroups.some((group) => JSON.stringify(group) === groupKey)) {
        continue
      }

      currentGroups.push(desiredGroup)
      changed = true
    }

    current.hooks[eventName] = currentGroups
  }

  if (!changed) {
    return { created: false, injected: false }
  }

  writeFileSync(target, JSON.stringify(current, null, 2) + '\n', 'utf8')
  return { created: false, injected: true }
}

function disableCodexFeatures(target, featureLines) {
  if (!existsSync(target)) {
    return
  }

  let current = readFileSync(target, 'utf8')
  for (const featureLine of featureLines) {
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

function disableClaudeHooks(target, desiredContent) {
  if (!existsSync(target)) {
    return
  }

  const desired = JSON.parse(desiredContent)
  const current = JSON.parse(readFileSync(target, 'utf8'))

  if (!current.hooks) {
    return
  }

  let changed = false

  for (const [eventName, currentGroups] of Object.entries(current.hooks)) {
    if (!Array.isArray(currentGroups)) {
      continue
    }

    const removedFragments = new Set(REMOVED_CLAUDE_HOOK_FRAGMENTS)
    const nextGroups = currentGroups.filter((group) => !claudeHookGroupTargetsAny(group, removedFragments))

    if (nextGroups.length !== currentGroups.length) {
      changed = true
    }

    if (nextGroups.length === 0) {
      delete current.hooks[eventName]
      continue
    }

    current.hooks[eventName] = nextGroups
  }

  for (const [eventName, desiredGroups] of Object.entries(desired.hooks ?? {})) {
    const currentGroups = current.hooks[eventName]

    if (!Array.isArray(currentGroups)) {
      continue
    }

    const desiredFragments = new Set(desiredGroups.flatMap(claudeHookFragments))
    const nextGroups = currentGroups.filter((group) => !claudeHookGroupTargetsAny(group, desiredFragments))

    if (nextGroups.length !== currentGroups.length) {
      changed = true
    }

    if (nextGroups.length === 0) {
      delete current.hooks[eventName]
      continue
    }

    current.hooks[eventName] = nextGroups
  }

  if (Object.keys(current.hooks).length === 0) {
    delete current.hooks
  }

  if (!changed) {
    return
  }

  writeFileSync(target, JSON.stringify(current, null, 2) + '\n', 'utf8')
}

export function installProject(root = '.', { sourceRoot } = {}) {
  const paths = scaffoldProject(root)
  const currentPath = join(paths.runtimeRoot, 'state', 'current.json')
  const createdFiles = []

  removeManifestOwnedRemovedProjectFiles(paths.root)

  if (sourceRoot) {
    const runtimeBinRoot = join(sourceRoot, 'runtime', 'bin')
    if (existsSync(runtimeBinRoot)) {
      createdFiles.push(...syncTree(runtimeBinRoot, join(paths.runtimeRoot, 'bin')))
    }
    createdFiles.push(...syncTree(join(sourceRoot, 'runtime', 'lib'), join(paths.runtimeRoot, 'lib')))
    const sharedReferencesSourceRoot = join(sourceRoot, 'skills', '_shared', 'references')
    if (existsSync(sharedReferencesSourceRoot)) {
      createdFiles.push(...syncTree(sharedReferencesSourceRoot, paths.sharedReferencesRoot))
    }
    const sharedScriptsSourceRoot = join(sourceRoot, 'skills', '_shared', 'scripts')
    if (existsSync(sharedScriptsSourceRoot)) {
      createdFiles.push(...syncTree(sharedScriptsSourceRoot, paths.sharedScriptsRoot))
    }
  }

  if (!existsSync(currentPath)) {
    saveCurrentState(currentPath, {
      activeChange: 'bootstrap',
      stage: 'frame'
    })
    createdFiles.push(currentPath)
  }

  rememberProjectFiles(paths.root, managedFiles(paths.root, createdFiles))

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
  const manifest = loadManifest(paths.root)
  const hasHostInstalls = Object.keys(manifest.hosts).length > 0

  rmSync(paths.runtimeRoot, { recursive: true, force: true })
  pruneEmptyDirectories(dirname(paths.runtimeRoot), paths.agentRoot)

  if (!hasHostInstalls) {
    forgetProject(paths.root)
  }

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

  migrateLegacyHostFiles(paths.root, host)
  migrateLegacySkillNames(paths.root, host)
  removeManifestOwnedRemovedSkills(paths.root, host)
  removeManifestOwnedRemovedHostFiles(paths.root, host)
  removeManifestOwnedRemovedHostScripts(paths.root, host)
  const sharedRefsRoot = join(sourceRoot, 'skills', '_shared', 'references')
  removeManifestOwnedSharedReferences(paths.root, host, sharedRefsRoot)
  const sharedScriptsRoot = join(sourceRoot, 'skills', '_shared', 'scripts')
  removeManifestOwnedSharedScripts(paths.root, host, sharedScriptsRoot)

  const manifest = loadManifest(paths.root)
  const hostEntry = manifest.hosts[host.id] ?? { files: [], mutations: {} }
  const managedPaths = new Set(hostEntry.files)

  const projectSkillRoot = join(paths.root, host.skillRoot)
  const createdFiles = seedTree(join(sourceRoot, 'skills'), projectSkillRoot, {
    root: paths.root,
    managedPaths,
    skipDirectories: ['scripts']
  })

  for (const entry of readdirSync(projectSkillRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const skillPath = join(projectSkillRoot, entry.name)
    const hostToolsTarget = join(skillPath, 'references', 'HOST-TOOLS.md')
    if (seedFile(hostToolsTarget, renderHostToolsReference(host), { root: paths.root, managedPaths })) {
      createdFiles.push(hostToolsTarget)
    }
  }

  const mutations = {}

  const installFiles = host.installFiles?.({ root: paths.root }) ?? {}
  for (const [relativePath, content] of Object.entries(installFiles)) {
    const target = join(paths.root, relativePath)

    if (relativePath === '.codex/config.toml') {
      const result = ensureCodexFeaturesEnabled(target)
      if (result.created) {
        createdFiles.push(target)
      }
      if (result.injected) {
        mutations.codexHooksInjected = result.injectedFeatures.includes(CODEX_HOOKS_FEATURE_LINE)
        mutations.codexMultiAgentInjected = result.injectedFeatures.includes(CODEX_MULTI_AGENT_FEATURE_LINE)
      }
      continue
    }

    if (relativePath === '.claude/settings.json') {
      const result = ensureClaudeHooksConfigured(target, content)
      if (result.created) {
        createdFiles.push(target)
      }
      if (result.injected) {
        mutations.claudeHooksInjected = true
      }
      continue
    }

    if (seedFile(target, content, { root: paths.root, managedPaths })) {
      createdFiles.push(target)
    }
  }

  rememberHostInstall(paths.root, host.id, managedFiles(paths.root, createdFiles), mutations)

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
  const manifest = loadManifest(paths.root)
  const projectSkillRoot = join(paths.root, host.skillRoot)
  const hostRootPath = hostRoot(paths.root, host)
  const hostEntry = manifest.hosts[host.id] ?? { files: [], mutations: {} }

  for (const relativePath of hostEntry.files) {
    const target = join(paths.root, relativePath)
    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), managedRootForRelativePath(paths.root, relativePath))
  }

  if (hostEntry.mutations?.codexHooksInjected || hostEntry.mutations?.codexMultiAgentInjected) {
    const configTarget = join(paths.root, '.codex', 'config.toml')
    const featureLines = []
    if (hostEntry.mutations?.codexHooksInjected) {
      featureLines.push(CODEX_HOOKS_FEATURE_LINE)
    }
    if (hostEntry.mutations?.codexMultiAgentInjected) {
      featureLines.push(CODEX_MULTI_AGENT_FEATURE_LINE)
    }
    disableCodexFeatures(configTarget, featureLines)
    pruneEmptyDirectories(dirname(configTarget), join(paths.root, '.codex'))
  }

  if (hostEntry.mutations?.claudeHooksInjected) {
    const installFiles = host.installFiles?.({ root: paths.root }) ?? {}
    const settingsContent = installFiles['.claude/settings.json']

    if (settingsContent) {
      disableClaudeHooks(join(paths.root, '.claude', 'settings.json'), settingsContent)
    }
  }

  pruneEmptyDirectories(projectSkillRoot, hostRootPath)
  forgetHost(paths.root, host.id)

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
