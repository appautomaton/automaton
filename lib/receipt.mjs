import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'

import { automatonPaths } from './paths.mjs'

// The install receipt records the facts only the install moment can observe:
// which files Automaton wrote (with content hashes), which directories it
// created because they did not exist before, and which fragments it merged
// into shared host configs. Uninstall and upgrade consume it so they act on
// what THIS project actually received, not on what the current source tree
// would install today (DD-011). Everything under `.agent/.automaton/` is
// namespace-owned machinery and is intentionally not file-tracked: the
// runtime root is replaced on install and removed whole on uninstall.
export const RECEIPT_SCHEMA = 1

const RECEIPT_RELATIVE_PATH = join('.agent', '.automaton', 'state', 'install-manifest.json')

export function receiptPath(root = '.') {
  return join(automatonPaths(root).root, RECEIPT_RELATIVE_PATH)
}

function toPosix(relativePath) {
  return relativePath.split(sep).join('/')
}

// Posix-relative path of `target` inside `root`, or null when target sits
// outside the project root and must not enter the receipt.
export function relativePathWithin(root, target) {
  const rel = relative(automatonPaths(root).root, target)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    return null
  }
  return toPosix(rel)
}

// Hashes are computed against LF-normalized content so CRLF and LF versions
// of the same logical text compare equal across platforms. Every installed
// file is text (md, mjs, json, toml).
export function hashContent(content) {
  const normalized = String(content).replace(/\r\n/g, '\n')
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}

export function hashFile(target) {
  if (!existsSync(target)) {
    return null
  }
  return hashContent(readFileSync(target, 'utf8'))
}

// Receipt entries drive deletions, so paths are validated at the load
// boundary: only project-relative posix paths strictly below the root are
// accepted. Empty, `.`, and `..` segments are all rejected, so a corrupt or
// hand-edited manifest can never reach outside the project root or alias the
// root itself.
function isSafeEntryPath(path) {
  if (typeof path !== 'string' || path.length === 0 || isAbsolute(path) || path.includes('\\')) {
    return false
  }
  return path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

function emptyReceipt(automatonVersion) {
  return {
    schema: RECEIPT_SCHEMA,
    automatonVersion: automatonVersion ?? null,
    installedAt: null,
    files: [],
    createdDirs: [],
    merges: []
  }
}

// Returns the normalized in-memory receipt, or null when no receipt exists.
// Unknown or pre-schema manifest formats are treated as absent: callers fall
// back to legacy source-recompute behavior rather than acting on a shape this
// version does not understand.
export function loadReceipt(root = '.') {
  const target = receiptPath(root)
  if (!existsSync(target)) {
    return null
  }

  let parsed
  try {
    parsed = JSON.parse(readFileSync(target, 'utf8'))
  } catch {
    return null
  }

  if (parsed?.schema !== RECEIPT_SCHEMA) {
    return null
  }

  return {
    schema: RECEIPT_SCHEMA,
    automatonVersion: parsed.automaton_version ?? null,
    installedAt: parsed.installed_at ?? null,
    files: Array.isArray(parsed.files)
      ? parsed.files
          .filter((entry) => isSafeEntryPath(entry?.path) && typeof entry?.owner === 'string')
          .map((entry) => ({ path: entry.path, hash: entry.hash ?? null, owner: entry.owner }))
      : [],
    createdDirs: Array.isArray(parsed.created_dirs)
      ? parsed.created_dirs
          .filter((entry) => isSafeEntryPath(entry?.path) && typeof entry?.owner === 'string')
          .map((entry) => ({ path: entry.path, owner: entry.owner }))
      : [],
    merges: Array.isArray(parsed.merges)
      ? parsed.merges
          .filter((entry) => isSafeEntryPath(entry?.path) && typeof entry?.owner === 'string')
          .map((entry) => ({
            path: entry.path,
            owner: entry.owner,
            fragments: Array.isArray(entry.fragments) ? entry.fragments : [],
            addedLines: Array.isArray(entry.added_lines) ? entry.added_lines : []
          }))
      : []
  }
}

export function saveReceipt(root, receipt) {
  const target = receiptPath(root)
  mkdirSync(dirname(target), { recursive: true })
  const serialized = {
    schema: RECEIPT_SCHEMA,
    automaton_version: receipt.automatonVersion ?? null,
    installed_at: receipt.installedAt ?? null,
    files: receipt.files.map((entry) => ({ path: entry.path, hash: entry.hash, owner: entry.owner })),
    created_dirs: receipt.createdDirs.map((entry) => ({ path: entry.path, owner: entry.owner })),
    merges: receipt.merges.map((entry) => ({
      path: entry.path,
      owner: entry.owner,
      fragments: entry.fragments,
      added_lines: entry.addedLines
    }))
  }
  writeFileSync(target, JSON.stringify(serialized, null, 2) + '\n', 'utf8')
}

export function receiptOwners(receipt) {
  const owners = new Set()
  for (const group of [receipt.files, receipt.createdDirs, receipt.merges]) {
    for (const entry of group) {
      owners.add(entry.owner)
    }
  }
  return owners
}

export function entriesForOwner(receipt, owner) {
  return {
    files: receipt.files.filter((entry) => entry.owner === owner),
    createdDirs: receipt.createdDirs.filter((entry) => entry.owner === owner),
    merges: receipt.merges.filter((entry) => entry.owner === owner)
  }
}

// A recorder accumulates one owner's entries during a single install pass.
// `ensureDir` is the only directory-creation door: it walks up from the
// target, notes every level that does not exist yet, then creates the chain.
// That before-the-write observation is what makes uninstall provenance exact.
export function createRecorder(root, owner) {
  const resolvedRoot = automatonPaths(root).root
  const runtimePrefix = toPosix(join('.agent', '.automaton')) + '/'
  const files = new Map()
  const createdDirs = new Set()
  const merges = new Map()
  const warnings = []

  function relativeToRoot(target) {
    return relativePathWithin(resolvedRoot, target)
  }

  return {
    owner,
    warnings,
    ensureDir(target) {
      const missing = []
      let current = target
      while (!existsSync(current)) {
        const rel = relativeToRoot(current)
        if (rel === null) {
          break
        }
        missing.push(rel)
        const parent = dirname(current)
        if (parent === current) {
          break
        }
        current = parent
      }
      mkdirSync(target, { recursive: true })
      for (const rel of missing) {
        createdDirs.add(rel)
      }
    },
    recordFile(target, content) {
      const rel = relativeToRoot(target)
      if (rel === null || rel.startsWith(runtimePrefix)) {
        return
      }
      files.set(rel, content === undefined ? hashFile(target) : hashContent(content))
    },
    carryForward(entry) {
      if (!files.has(entry.path)) {
        files.set(entry.path, entry.hash)
      }
    },
    // Re-assert provenance across reinstalls: a directory this project's
    // FIRST install created stays ours even though it exists by the time a
    // reinstall runs and would never be observed as missing again.
    carryForwardDir(path) {
      createdDirs.add(path)
    },
    recordMerge(target, { fragments = [], addedLines = [] } = {}) {
      const rel = relativeToRoot(target)
      if (rel === null) {
        return
      }
      const existing = merges.get(rel) ?? { fragments: new Set(), addedLines: new Set() }
      for (const fragment of fragments) {
        existing.fragments.add(fragment)
      }
      for (const line of addedLines) {
        existing.addedLines.add(line)
      }
      merges.set(rel, existing)
    },
    warn(code, message) {
      warnings.push({ level: 'warning', code, message })
    },
    entries() {
      return {
        files: [...files.entries()].map(([path, hash]) => ({ path, hash, owner })),
        createdDirs: [...createdDirs].map((path) => ({ path, owner })),
        merges: [...merges.entries()].map(([path, value]) => ({
          path,
          owner,
          fragments: [...value.fragments],
          addedLines: [...value.addedLines]
        }))
      }
    }
  }
}

// Replace one owner's entries with the recorder's findings, leaving every
// other owner's entries untouched. A `--codex` reinstall must never disturb
// the claude entries recorded by an earlier pass.
export function mergeReceipt(previous, recorder, { automatonVersion, installedAt } = {}) {
  const base = previous ?? emptyReceipt(automatonVersion)
  const recorded = recorder.entries()
  return {
    schema: RECEIPT_SCHEMA,
    automatonVersion: automatonVersion ?? base.automatonVersion,
    installedAt: installedAt ?? base.installedAt,
    files: [...base.files.filter((entry) => entry.owner !== recorder.owner), ...recorded.files],
    createdDirs: [
      ...base.createdDirs.filter((entry) => entry.owner !== recorder.owner),
      ...recorded.createdDirs
    ],
    merges: [...base.merges.filter((entry) => entry.owner !== recorder.owner), ...recorded.merges]
  }
}

// Trellis-style safe delete: remove the file only when its content still
// matches the hash recorded at install time. A user-modified file is kept and
// reported, never silently destroyed.
export function safeDeleteFile(root, entry, warn) {
  const target = join(automatonPaths(root).root, entry.path)
  if (!existsSync(target)) {
    return
  }
  const currentHash = hashFile(target)
  if (entry.hash && currentHash !== entry.hash) {
    warn?.('kept_modified_file', `${entry.path} was modified after install and was kept`)
    return
  }
  rmSync(target, { force: true })
}

// Remove recorded-as-created directories, deepest first, but only when they
// are empty now. A directory that pre-existed the install is never a
// candidate, even when it is empty.
export function pruneCreatedDirs(root, createdDirs) {
  const resolvedRoot = automatonPaths(root).root
  const sorted = [...createdDirs].sort((a, b) => b.path.length - a.path.length)
  for (const entry of sorted) {
    const target = join(resolvedRoot, entry.path)
    if (existsSync(target) && readdirSync(target).length === 0) {
      rmSync(target, { recursive: true, force: true })
    }
  }
}
