import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'

import { automatonPaths } from './paths.mjs'
import {
  createRecorder,
  entriesForOwner,
  hashContent,
  hashFile,
  loadReceipt,
  mergeReceipt,
  pruneCreatedDirs,
  receiptPath,
  relativePathWithin,
  safeDeleteFile,
  saveReceipt,
  warning
} from './receipt.mjs'
import { scaffoldProject } from './scaffold.mjs'
import { saveCurrentState } from './state.mjs'

const AUTOMATON_VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version

const CODEX_HOOKS_FEATURE_LINE = 'hooks = true'
const LEGACY_CODEX_HOOKS_FEATURE_LINE = 'codex_hooks = true'
const CODEX_MULTI_AGENT_FEATURE_LINE = 'multi_agent = true'
const CODEX_FEATURE_LINES = [CODEX_HOOKS_FEATURE_LINE, CODEX_MULTI_AGENT_FEATURE_LINE]
const GENERATED_CODEX_CONFIG = `[features]\n${CODEX_FEATURE_LINES.join('\n')}\n`
const CODEX_HOOK_FRAGMENT_PATTERN = /\.codex\/hooks\/[A-Za-z0-9._-]+\.mjs/g
const CLAUDE_HOOK_FRAGMENT_PATTERN = /\.claude\/hooks\/[A-Za-z0-9._-]+\.mjs/g

const EMPTY_OWNER_ENTRIES = { files: [], createdDirs: [], merges: [] }

// Automaton subagent roles. Each host renders these into its native agent format
// during installHost(); uninstallHost() removes the same set by exact name.
// Ids are append-only (DD-008): add new roles here, but never rename or remove a
// shipped id. A newer uninstaller relies on its id list being a superset of every
// older install's files. Adding a role propagates to every host adapter through
// host.renderAgentDefinition / agentRelativePath.
export const SUBAGENT_ROLES = [
  {
    id: 'implementer',
    agentName: 'automaton-implementer',
    description: 'Implements exactly one approved Automaton plan slice from coordinator-provided context and returns evidence.',
    intent: 'edit'
  },
  {
    id: 'spec-reviewer',
    agentName: 'automaton-spec-reviewer',
    description: 'Reviews spec compliance for one approved Automaton plan slice. Verdict only; no edits.',
    intent: 'review'
  },
  {
    id: 'quality-reviewer',
    agentName: 'automaton-quality-reviewer',
    description: 'Reviews maintainability and regression risk for one approved Automaton plan slice. Verdict only; no edits.',
    intent: 'review'
  },
  {
    id: 'librarian',
    agentName: 'automaton-librarian',
    // intent 'explore' is read-only like 'review' but is a distinct, cross-stage one-shot
    // lookup role: any skill may dispatch it for codebase exploration. modelTier 'light'
    // asks each host to pin its cheap model tier where one is available.
    description: 'Read-only codebase explorer. Answers where/how/which-files questions and returns a bounded, anchored map. Evidence only; no edits, no decisions.',
    intent: 'explore',
    modelTier: 'light'
  }
]

function readRoleBody(sourceRoot, roleId) {
  return readFileSync(
    join(sourceRoot, 'skills', 'auto-execute', 'role-sources', `${roleId}-role.md`),
    'utf8'
  )
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
    '## Automaton Subagents',
    '',
    '`installHost()` wrote these host-native subagents into this host\'s agent directory:',
    ''
  ]

  for (const role of SUBAGENT_ROLES) {
    const where = role.intent === 'explore'
      ? 'office-hours, frame, plan, and execute; read-only one-shot lookup'
      : 'execute stage; dispatched by auto-execute'
    lines.push(`- \`${role.agentName}\`: ${role.description} (${where})`)
  }

  lines.push(
    '',
    'Their static role bodies are baked into the host agent files. Execute-stage agents take per-call slots from `auto-execute/references/*-prompt.md` (slice, edit scope, constraints, acceptance criteria, implementation summary). The read-only `automaton-librarian` is governed by `.agent/.automaton/references/LIBRARIAN.md` and may be dispatched from the skills that carry this reference: auto-frame, auto-plan, and auto-execute.',
    '',
    '## Dispatch',
    '',
    `- availability: ${mapping.unavailable ? 'unavailable' : 'available'}`,
    `- dispatch: ${mapping.subagents ?? 'No host-specific subagent mapping has been defined.'}`,
    `- wait: ${mapping.wait ?? 'Use the host default completion behavior.'}`,
    `- cleanup: ${mapping.cleanup ?? 'No host-specific cleanup guidance.'}`,
    `- tracking: ${mapping.tracking ?? 'Use the host default task tracking behavior.'}`,
    `- isolation: ${mapping.isolation ?? 'No host-native worktree isolation: the coordinator creates worktrees manually for parallel dispatch (see auto-execute/references/git-rhythm.md, Parallel Isolation).'}`
  )

  if (mapping.configuration) {
    lines.push(`- configuration: ${mapping.configuration}`)
  }
  if (mapping.precondition) {
    lines.push(`- precondition: ${mapping.precondition}`)
  }

  lines.push(
    '',
    '## Rules',
    '',
    '- Follow the skill protocol first; this file only maps host tool names.',
    '- Dispatch only by named agent (`automaton-implementer`, `automaton-spec-reviewer`, `automaton-quality-reviewer`, `automaton-librarian`). Do not paste a role body into a generic worker, explorer, or other host agent at runtime.',
    '- If the host cannot expose one of the named agents (configuration disabled, permission denied, capability missing), stop under SUBAGENT-PROTOCOL.md\'s "Host does not expose subagent support" condition. Do not fall back to runtime-curated prompt injection.',
    '- Do not invent a universal SDK or CLI when the host has native subagent tools.',
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

// Receipt-aware write: warns when it replaces a file Automaton cannot account
// for (one that existed without a receipt entry), then records the new content
// hash. Edits to previously-installed files are detected by the caller's
// upfront hash snapshot, because tree syncs delete before this writes.
function trackedWrite(target, content, context) {
  if (!context) {
    writeFile(target, content)
    return
  }

  const { root, recorder, previousFiles } = context

  if (existsSync(target)) {
    const rel = relativePathWithin(root, target)
    const previous = rel ? previousFiles.get(rel) : undefined
    if (!previous && hashFile(target) !== hashContent(content)) {
      recorder.warn('overwrote_existing_file', `${rel} existed before this install and has been replaced`)
    }
  }

  recorder.ensureDir(dirname(target))
  writeFileSync(target, content, 'utf8')
  recorder.recordFile(target, content)
}

function copyTreeSkippingDirectories(sourceRoot, targetRoot, skippedDirectories = new Set(), context = null) {
  if (context) {
    context.recorder.ensureDir(targetRoot)
  } else {
    mkdirSync(targetRoot, { recursive: true })
  }

  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (skippedDirectories.has(entry.name)) {
      continue
    }

    const sourcePath = join(sourceRoot, entry.name)
    const targetPath = join(targetRoot, entry.name)

    if (entry.isDirectory()) {
      copyTreeSkippingDirectories(sourcePath, targetPath, skippedDirectories, context)
      continue
    }

    trackedWrite(targetPath, readFileSync(sourcePath, 'utf8'), context)
  }
}

function replaceOptionalTree(sourceRoot, targetRoot, context = null) {
  rmSync(targetRoot, { recursive: true, force: true })

  if (!existsSync(sourceRoot)) {
    return
  }

  copyTreeSkippingDirectories(sourceRoot, targetRoot, new Set(), context)
}

function pruneEmptyDirectories(target, stopAt) {
  let current = target

  // Containment is a path-segment test, not a string prefix: `.claude-backup`
  // is not inside `.claude`. `stopAt` itself never qualifies.
  while (current.startsWith(stopAt + sep) && existsSync(current)) {
    if (readdirSync(current).length > 0) {
      return
    }

    rmSync(current, { recursive: true, force: true })
    current = dirname(current)
  }
}

// Pre-receipt installs may carry a manifest in a format this version does not
// understand. It is discarded so a fresh receipt can take its place; a valid
// schema receipt is never touched by this.
function removeForeignManifest(root) {
  const target = receiptPath(root)
  if (existsSync(target) && loadReceipt(root) === null) {
    rmSync(target, { force: true })
  }
}

function sourceSkillNames(sourceRoot) {
  return readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== '_shared')
}

// Warn for files the receipt cannot account for before a skill directory is
// replaced wholesale. A user file that collides with an automaton skill name
// must never disappear silently. The colliding path may itself be a file, not
// a directory. Receipt-owned files need no warning here: the reconcile pass
// reports modified ones and restores modified orphans.
function warnUnaccountedSkillFiles(target, context) {
  if (statSync(target).isDirectory()) {
    for (const entry of readdirSync(target)) {
      warnUnaccountedSkillFiles(join(target, entry), context)
    }
    return
  }
  const rel = relativePathWithin(context.root, target)
  if (rel && !context.previousFiles.has(rel)) {
    context.recorder.warn('overwrote_existing_file', `${rel} existed before this install and has been replaced`)
  }
}

function removeSkillDirectories(targetRoot, skillNames, context = null) {
  if (!existsSync(targetRoot)) {
    return
  }

  for (const skillName of skillNames) {
    const target = join(targetRoot, skillName)
    if (context && existsSync(target)) {
      warnUnaccountedSkillFiles(target, context)
    }
    rmSync(target, { recursive: true, force: true })
  }
}

function syncHostSkills(sourceRoot, targetRoot, context = null) {
  if (context) {
    context.recorder.ensureDir(targetRoot)
  } else {
    mkdirSync(targetRoot, { recursive: true })
  }
  const skillNames = sourceSkillNames(sourceRoot)
  removeSkillDirectories(targetRoot, skillNames, context)

  for (const skillName of skillNames) {
    copyTreeSkippingDirectories(
      join(sourceRoot, skillName),
      join(targetRoot, skillName),
      // `scripts` and `role-sources` are build inputs, not runtime references: shared
      // scripts install once under .agent/.automaton/scripts, and role bodies are
      // compiled into host-native agent files. Neither ships into the skill's references/.
      new Set(['scripts', 'role-sources']),
      context
    )
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Returns the feature lines this install actually added, so the receipt can
// scope uninstall to them. A line the user already had is never ours to remove.
function ensureCodexFeaturesEnabled(target) {
  if (!existsSync(target)) {
    writeFile(target, GENERATED_CODEX_CONFIG)
    return { addedLines: [...CODEX_FEATURE_LINES] }
  }

  let current = readFileSync(target, 'utf8')
  const original = current
  current = current.replace(new RegExp(`^\\s*${escapeRegExp(LEGACY_CODEX_HOOKS_FEATURE_LINE)}\\s*\\n?`, 'm'), '')
  const missingFeatureLines = CODEX_FEATURE_LINES.filter((line) => !current.includes(line))
  // A removed legacy `codex_hooks = true` line means the modern `hooks = true`
  // replacing it is Automaton's, even though the user file already had hook
  // enablement in the legacy spelling. A user who already had the modern line
  // alongside the legacy one owns it: only the legacy duplicate was ours to
  // touch, so nothing is claimed.
  const userHadModernHooks = new RegExp(`^\\s*${escapeRegExp(CODEX_HOOKS_FEATURE_LINE)}\\s*$`, 'm').test(original)
  const legacyHooksMigrated = current !== original && !userHadModernHooks

  if (missingFeatureLines.length === 0) {
    if (current !== original) {
      writeFileSync(target, current, 'utf8')
    }
    return { addedLines: legacyHooksMigrated ? [CODEX_HOOKS_FEATURE_LINE] : [] }
  }

  const addedLines = legacyHooksMigrated && !missingFeatureLines.includes(CODEX_HOOKS_FEATURE_LINE)
    ? [CODEX_HOOKS_FEATURE_LINE, ...missingFeatureLines]
    : [...missingFeatureLines]

  if (current.includes('[features]')) {
    writeFileSync(target, current.replace('[features]', `[features]\n${missingFeatureLines.join('\n')}`), 'utf8')
    return { addedLines }
  }

  const prefix = current.endsWith('\n') ? current : `${current}\n`
  writeFileSync(target, `${prefix}\n[features]\n${missingFeatureLines.join('\n')}\n`, 'utf8')
  return { addedLines }
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

function desiredHookFragments(desiredContent, pattern) {
  const desired = JSON.parse(desiredContent)
  const fragments = new Set()
  for (const groups of Object.values(desired.hooks ?? {})) {
    for (const group of groups) {
      for (const fragment of hookFragments(group, pattern)) {
        fragments.add(fragment)
      }
    }
  }
  return fragments
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

// Returns the hook fragments Automaton owns in this config, for the receipt.
function ensureHookConfig(target, desiredContent, pattern) {
  const desired = JSON.parse(desiredContent)
  const ownedFragments = [...desiredHookFragments(desiredContent, pattern)]

  if (!existsSync(target)) {
    writeFile(target, desiredContent)
    return { fragments: ownedFragments }
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
    return { fragments: ownedFragments }
  }

  writeFileSync(target, JSON.stringify(current, null, 2) + '\n', 'utf8')
  return { fragments: ownedFragments }
}

// Strips exactly the given feature lines (plus the legacy spelling) from a
// codex config. Receipt-driven uninstalls pass the lines this install added;
// the legacy fallback passes only the hook lines, preserving the historical
// behavior of leaving `multi_agent = true` in place when provenance is unknown.
function cleanupCodexConfig(target, featureLines) {
  if (!existsSync(target)) {
    return
  }

  let current = readFileSync(target, 'utf8')

  for (const featureLine of [...featureLines, LEGACY_CODEX_HOOKS_FEATURE_LINE]) {
    current = current.replace(new RegExp(`^\\s*${escapeRegExp(featureLine)}\\s*\\n?`, 'm'), '')
  }
  current = current.replace(/\n?\[features\]\n(?=(?:\s*\n)*(?:\[|$))/g, '\n')
  current = current.replace(/\n{3,}/g, '\n\n').trim()

  if (!current) {
    rmSync(target, { force: true })
    return
  }

  writeFileSync(target, `${current}\n`, 'utf8')
}

function disableHookConfig(target, fragments, pattern) {
  if (!existsSync(target) || fragments.size === 0) {
    return
  }

  const current = JSON.parse(readFileSync(target, 'utf8'))

  if (!current.hooks) {
    return
  }

  let changed = false

  for (const eventName of Object.keys(current.hooks)) {
    const currentGroups = current.hooks[eventName]

    if (!Array.isArray(currentGroups)) {
      continue
    }

    const removed = removeTargetedHookGroups(currentGroups, fragments, pattern)
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

function hookMergeStrategy(pattern) {
  const disable = (target, fragments) => disableHookConfig(target, fragments, pattern)
  return {
    install(target, content, previousMerge, recorder) {
      const { fragments } = ensureHookConfig(target, content, pattern)
      pruneStaleMergeFragments(target, previousMerge, fragments, disable)
      recorder.recordMerge(target, { fragments })
    },
    uninstall(target, entry) {
      disable(target, new Set(entry.fragments))
    },
    legacyUninstall(target, content) {
      disable(target, desiredHookFragments(content, pattern))
    }
  }
}

// Shared host configs Automaton merges into rather than owns, keyed by the
// receipt's relative path. Each entry pairs the install-side ensure with its
// exact uninstall inverse, so the provenance `install` records is always
// consumable by `uninstall` (DD-011); `legacyUninstall` reverts a pre-receipt
// install from the shipped content alone. A new mergeable host config needs
// exactly one entry here.
const MERGE_STRATEGIES = {
  '.codex/config.toml': {
    // The shipped content is ignored: the codex config merge is line-oriented
    // (feature lines in an existing user file), not a whole-file template.
    install(target, _content, previousMerge, recorder) {
      const { addedLines } = ensureCodexFeaturesEnabled(target)
      // Lines a previous install added stay automaton's even though this run
      // found them already present; lines this version no longer ships are
      // stripped from the config as part of the upgrade.
      const previousLines = previousMerge?.addedLines ?? []
      const carried = previousLines.filter((line) => CODEX_FEATURE_LINES.includes(line))
      const stale = previousLines.filter((line) => !CODEX_FEATURE_LINES.includes(line))
      if (stale.length > 0) {
        cleanupCodexConfig(target, stale)
      }
      recorder.recordMerge(target, { addedLines: [...new Set([...addedLines, ...carried])] })
    },
    uninstall(target, entry) {
      cleanupCodexConfig(target, entry.addedLines)
    },
    // Without a receipt the provenance of `multi_agent = true` is unknown,
    // so only the hook lines are stripped (the historical behavior).
    legacyUninstall(target) {
      cleanupCodexConfig(target, [CODEX_HOOKS_FEATURE_LINE])
    }
  },
  '.codex/hooks.json': hookMergeStrategy(CODEX_HOOK_FRAGMENT_PATTERN),
  '.claude/settings.json': hookMergeStrategy(CLAUDE_HOOK_FRAGMENT_PATTERN)
}

function previousEntriesFor(root, owner) {
  const previous = loadReceipt(root)
  return {
    previous,
    ownerEntries: previous ? entriesForOwner(previous, owner) : EMPTY_OWNER_ENTRIES
  }
}

// Upgrade hygiene: hook fragments a previous install recorded but this
// version no longer ships are removed from the shared config now, not left
// dangling toward an orphan script the reconcile pass is about to delete.
function pruneStaleMergeFragments(target, previousMerge, desiredFragments, disable) {
  const stale = new Set((previousMerge?.fragments ?? []).filter((fragment) => !desiredFragments.includes(fragment)))
  if (stale.size > 0) {
    disable(target, stale)
  }
}

// Snapshot which previously-installed files were locally modified BEFORE any
// tree sync deletes them, keeping their content: a still-shipped file is
// regenerated and reported, while a modified orphan destroyed by the
// wholesale skill sync is restored from this snapshot instead of being lost.
function modifiedSincePreviousInstall(root, ownerEntries) {
  const modified = new Map()
  for (const entry of ownerEntries.files) {
    if (!entry.hash) {
      continue
    }
    const target = join(root, entry.path)
    if (!existsSync(target)) {
      continue
    }
    const content = readFileSync(target, 'utf8')
    if (hashContent(content) !== entry.hash) {
      modified.set(entry.path, content)
    }
  }
  return modified
}

// Carry still-standing provenance from the previous receipt into this run's
// recorder, then remove orphans: files the previous install owned that this
// version no longer writes. Orphans are hash-guarded: a user-modified file
// is kept and reported, never silently destroyed.
function reconcilePreviousEntries(root, recorder, ownerEntries, { shippedFiles = null, orphanPruneStop = null, modifiedBefore = new Map() } = {}) {
  const recorded = recorder.entries()
  const recordedFiles = new Set(recorded.files.map((entry) => entry.path))
  const recordedMerges = new Set(recorded.merges.map((entry) => entry.path))

  for (const entry of ownerEntries.files) {
    const stillShipped = shippedFiles ? shippedFiles.has(entry.path) : recordedFiles.has(entry.path)
    if (stillShipped) {
      if (recordedFiles.has(entry.path) && modifiedBefore.has(entry.path)) {
        recorder.warn(
          'overwrote_modified_file',
          `${entry.path} was modified after the previous install and has been regenerated; durable edits belong in the automaton source`
        )
      }
      if (existsSync(join(root, entry.path))) {
        recorder.carryForward(entry)
      }
      continue
    }
    // A modified orphan the skill sync already deleted is restored from the
    // pre-sync snapshot: the user's edits outrank a file we no longer ship.
    // It leaves the receipt either way and becomes user-owned from here on.
    if (modifiedBefore.has(entry.path) && !existsSync(join(root, entry.path))) {
      writeFile(join(root, entry.path), modifiedBefore.get(entry.path))
      recorder.warn('kept_modified_file', `${entry.path} was modified after install and was kept`)
    } else {
      safeDeleteFile(root, entry, recorder.warn)
    }
    if (orphanPruneStop) {
      pruneEmptyDirectories(dirname(join(root, entry.path)), orphanPruneStop)
    }
  }

  for (const entry of ownerEntries.createdDirs) {
    if (existsSync(join(root, entry.path))) {
      recorder.carryForwardDir(entry.path)
    }
  }

  // Merge entries the install loop already re-recorded carry their own
  // filtered provenance; re-recording the previous entry here would resurrect
  // fragments the upgrade just pruned.
  for (const entry of ownerEntries.merges) {
    if (recordedMerges.has(entry.path)) {
      continue
    }
    if (existsSync(join(root, entry.path))) {
      recorder.recordMerge(join(root, entry.path), entry)
    }
  }
}

export function installProject(root = '.', { sourceRoot } = {}) {
  removeForeignManifest(root)
  const { previous, ownerEntries } = previousEntriesFor(root, 'project')
  const resolvedRoot = automatonPaths(root).root
  const recorder = createRecorder(resolvedRoot, 'project')
  const previousFiles = new Map(ownerEntries.files.map((entry) => [entry.path, entry]))
  const context = { root: resolvedRoot, recorder, previousFiles }

  const paths = scaffoldProject(root, recorder)
  const currentPath = join(paths.runtimeRoot, 'state', 'current.json')

  if (sourceRoot) {
    replaceOptionalTree(join(sourceRoot, 'runtime', 'bin'), join(paths.runtimeRoot, 'bin'), context)
    replaceOptionalTree(join(sourceRoot, 'runtime', 'lib'), join(paths.runtimeRoot, 'lib'), context)
    replaceOptionalTree(join(sourceRoot, 'skills', '_shared', 'references'), paths.sharedReferencesRoot, context)
    replaceOptionalTree(join(sourceRoot, 'skills', '_shared', 'scripts'), paths.sharedScriptsRoot, context)
  }

  if (!existsSync(currentPath)) {
    saveCurrentState(currentPath, {
      activeChange: 'bootstrap',
      stage: 'frame'
    })
  }

  // Steering files this version still ships keep their install-time hash as
  // the pristine baseline; anything else the previous install recorded under
  // the project owner is an orphan.
  reconcilePreviousEntries(paths.root, recorder, ownerEntries, {
    shippedFiles: new Set(paths.steeringPaths)
  })

  saveReceipt(paths.root, mergeReceipt(previous, recorder, {
    automatonVersion: AUTOMATON_VERSION,
    installedAt: new Date().toISOString()
  }))

  return {
    id: 'agent',
    root: paths.root,
    agentRoot: paths.agentRoot,
    runtimeRoot: paths.runtimeRoot,
    currentPath,
    automatonVersion: AUTOMATON_VERSION,
    previousVersion: previous?.automatonVersion ?? null,
    warnings: recorder.warnings
  }
}

export function uninstallProject(root = '.') {
  const paths = automatonPaths(root)
  const receipt = loadReceipt(paths.root)
  const ownerEntries = receipt ? entriesForOwner(receipt, 'project') : null
  const warnings = []
  const warn = (code, message) => warnings.push(warning(code, message))

  // Everything under the runtime root is namespace-owned machinery; it is
  // removed whole. Project history under `.agent/` (work and steering the
  // user has touched) is preserved: only hash-pristine scaffold placeholders
  // are removed, because an unmodified placeholder carries no record.
  rmSync(paths.runtimeRoot, { recursive: true, force: true })

  if (ownerEntries) {
    for (const entry of ownerEntries.files) {
      safeDeleteFile(paths.root, entry, warn)
    }
    pruneCreatedDirs(paths.root, ownerEntries.createdDirs)
  }

  return {
    id: 'agent',
    root: paths.root,
    agentRoot: paths.agentRoot,
    runtimeRoot: paths.runtimeRoot,
    warnings
  }
}

export function installHost(host, { root = '.', sourceRoot }) {
  if (!sourceRoot) {
    throw new Error('missing install source root')
  }

  const project = installProject(root, { sourceRoot })
  const paths = automatonPaths(project.root)
  const { previous, ownerEntries } = previousEntriesFor(paths.root, host.id)
  const modifiedBefore = modifiedSincePreviousInstall(paths.root, ownerEntries)
  const recorder = createRecorder(paths.root, host.id)
  const previousFiles = new Map(ownerEntries.files.map((entry) => [entry.path, entry]))
  const context = { root: paths.root, recorder, previousFiles }
  const projectSkillRoot = join(paths.root, host.skillRoot)
  syncHostSkills(join(sourceRoot, 'skills'), projectSkillRoot, context)

  // HOST-TOOLS.md documents this host's subagent dispatch mechanism. It goes into every skill
  // that may dispatch an agent: auto-execute (implementer + reviewers) and the planning skills
  // that may dispatch the read-only librarian.
  const hostToolsReference = renderHostToolsReference(host)
  for (const dispatchingSkill of ['auto-execute', 'auto-frame', 'auto-plan']) {
    trackedWrite(join(projectSkillRoot, dispatchingSkill, 'references', 'HOST-TOOLS.md'), hostToolsReference, context)
  }

  // Generate host-native subagent definitions from the *-role.md source files. Each
  // host knows its own filename/schema; install.mjs only knows the role list and the
  // source layout. Generated files are derived install outputs and are overwritten
  // on reinstall; durable role authoring belongs in skills/auto-execute/role-sources/*-role.md.
  if (typeof host.renderAgentDefinition === 'function' && typeof host.agentRelativePath === 'function') {
    for (const role of SUBAGENT_ROLES) {
      const roleBody = readRoleBody(sourceRoot, role.id)
      const target = join(paths.root, host.agentRelativePath(role))
      trackedWrite(target, host.renderAgentDefinition(role, roleBody), context)
    }
  }

  const previousMerges = new Map(ownerEntries.merges.map((entry) => [entry.path, entry]))
  const installFiles = host.installFiles?.({ root: paths.root }) ?? {}
  for (const [relativePath, content] of Object.entries(installFiles)) {
    const target = join(paths.root, relativePath)
    const strategy = MERGE_STRATEGIES[relativePath]

    if (strategy) {
      recorder.ensureDir(dirname(target))
      strategy.install(target, content, previousMerges.get(relativePath), recorder)
      continue
    }

    trackedWrite(target, content, context)
  }

  reconcilePreviousEntries(paths.root, recorder, ownerEntries, {
    orphanPruneStop: hostRoot(paths.root, host),
    modifiedBefore
  })

  saveReceipt(paths.root, mergeReceipt(previous, recorder, {
    automatonVersion: AUTOMATON_VERSION,
    installedAt: new Date().toISOString()
  }))

  return {
    id: host.id,
    root: paths.root,
    agentRoot: paths.agentRoot,
    skillRoot: projectSkillRoot,
    warnings: [...project.warnings, ...recorder.warnings]
  }
}

function uninstallHostFromReceipt(host, paths, receipt, ownerEntries, warn) {
  const hostRootPath = hostRoot(paths.root, host)

  for (const entry of ownerEntries.files) {
    const target = join(paths.root, entry.path)
    if (existsSync(target)) {
      // Uninstall removes harness machinery even when it was edited locally:
      // the user asked for the harness to go. The edit is reported so nothing
      // disappears silently. Project history under `.agent/` follows the
      // opposite rule (see uninstallProject).
      if (entry.hash && hashFile(target) !== entry.hash) {
        warn('removed_modified_file', `${entry.path} was modified after install and was removed with the harness`)
      }
      rmSync(target, { force: true })
    }
    pruneEmptyDirectories(dirname(target), hostRootPath)
  }

  for (const entry of ownerEntries.merges) {
    MERGE_STRATEGIES[entry.path]?.uninstall(join(paths.root, entry.path), entry)
  }

  pruneCreatedDirs(paths.root, ownerEntries.createdDirs)

  const owners = { ...receipt.owners }
  delete owners[host.id]

  saveReceipt(paths.root, {
    ...receipt,
    owners,
    files: receipt.files.filter((entry) => entry.owner !== host.id),
    createdDirs: receipt.createdDirs.filter((entry) => entry.owner !== host.id),
    merges: receipt.merges.filter((entry) => entry.owner !== host.id)
  })
}

// Legacy fallback for installs that pre-date the receipt: the removal set is
// recomputed from the current source tree, exactly as before DD-011.
function uninstallHostLegacy(host, paths, { sourceRoot }) {
  if (!sourceRoot) {
    throw new Error('missing install source root')
  }

  const projectSkillRoot = join(paths.root, host.skillRoot)
  const hostRootPath = hostRoot(paths.root, host)

  removeSkillDirectories(projectSkillRoot, sourceSkillNames(join(sourceRoot, 'skills')))

  // Remove generated subagent definitions. Targets exactly the files installHost()
  // wrote. Unrelated user agents in the same directory are left alone, and the
  // .<host>/agents/ directory is pruned only if it ends up empty.
  if (typeof host.agentRelativePath === 'function') {
    let agentDir = null
    for (const role of SUBAGENT_ROLES) {
      const target = join(paths.root, host.agentRelativePath(role))
      agentDir = dirname(target)
      rmSync(target, { force: true })
    }
    if (agentDir) {
      pruneEmptyDirectories(agentDir, hostRootPath)
    }
  }

  const installFiles = host.installFiles?.({ root: paths.root }) ?? {}
  for (const [relativePath, content] of Object.entries(installFiles)) {
    const target = join(paths.root, relativePath)
    const strategy = MERGE_STRATEGIES[relativePath]

    if (strategy) {
      strategy.legacyUninstall(target, content)
      continue
    }

    rmSync(target, { force: true })
    pruneEmptyDirectories(dirname(target), hostRootPath)
  }

  pruneEmptyDirectories(projectSkillRoot, hostRootPath)
  removeForeignManifest(paths.root)
}

// True when the host's skill root holds automaton-named skill directories,
// the footprint a pre-receipt install would have left behind.
function hasAutomatonSkillTraces(root, host) {
  const skillRoot = join(root, host.skillRoot)
  if (!existsSync(skillRoot)) {
    return false
  }
  return readdirSync(skillRoot, { withFileTypes: true })
    .some((entry) => entry.isDirectory() && entry.name.startsWith('auto-'))
}

export function uninstallHost(host, { root = '.', sourceRoot } = {}) {
  const paths = automatonPaths(root)
  const receipt = loadReceipt(paths.root)
  const ownerEntries = receipt ? entriesForOwner(receipt, host.id) : null
  const hasReceiptEntries = ownerEntries !== null &&
    (ownerEntries.files.length > 0 || ownerEntries.createdDirs.length > 0 || ownerEntries.merges.length > 0)
  const warnings = []
  const warn = (code, message) => warnings.push(warning(code, message))

  if (hasReceiptEntries) {
    uninstallHostFromReceipt(host, paths, receipt, ownerEntries, warn)
  } else if (receipt) {
    // A valid receipt with no entries for this host means the receipt-era
    // installer never installed it here. Recomputing a removal set from the
    // source would delete files the receipt cannot account for, so this is a
    // no-op. Anything that looks like a pre-receipt install is reported with
    // the way out, never deleted on a guess.
    if (hasAutomatonSkillTraces(paths.root, host)) {
      warn(
        'unrecorded_host_install',
        `${host.skillRoot} holds automaton-named skills the receipt has no record of; left untouched (reinstall --${host.id}, then uninstall, to remove them)`
      )
    }
  } else {
    uninstallHostLegacy(host, paths, { sourceRoot })
  }

  return {
    id: host.id,
    root: paths.root,
    agentRoot: paths.agentRoot,
    skillRoot: join(paths.root, host.skillRoot),
    warnings
  }
}

export function installHosts(hosts, options) {
  return hosts.map((host) => installHost(host, options))
}

export function uninstallHosts(hosts, options) {
  return hosts.map((host) => uninstallHost(host, options))
}
