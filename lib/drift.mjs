import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { automatonPaths } from './paths.mjs'
import { loadReceipt } from './receipt.mjs'
import { HOSTS } from '../hosts/index.mjs'

// Drift between a project's installed copies and the CLI's source tree.
// Warning-level only: `status` orients, `validate` gates (DD-005 tiers).
// The failure this catches: a stale install keeps running skills the source
// removed, against a runtime contract the source has since changed, and
// nothing surfaces it because the installed files look healthy in isolation.

function sourceVersion(sourceRoot) {
  try {
    return JSON.parse(readFileSync(join(sourceRoot, 'package.json'), 'utf8')).version ?? null
  } catch {
    return null
  }
}

function sourceSkillNames(sourceRoot) {
  const skillsRoot = join(sourceRoot, 'skills')
  if (!existsSync(skillsRoot)) {
    return new Set()
  }
  return new Set(
    readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => entry.name)
  )
}

// Only automaton-named skill directories are considered: user skills that
// happen to live in the same host root are never drift.
function installedSkillDirs(skillRoot) {
  if (!existsSync(skillRoot)) {
    return []
  }
  return readdirSync(skillRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('auto-'))
    .map((entry) => entry.name)
}

export function driftReport(root = '.', { sourceRoot } = {}) {
  const warnings = []
  const paths = automatonPaths(root)

  if (!existsSync(paths.runtimeRoot)) {
    return warnings
  }

  const receipt = loadReceipt(root)
  if (!receipt) {
    warnings.push({
      level: 'warning',
      code: 'missing_receipt',
      message: 'no install receipt: this install predates receipt tracking, so upgrades cannot prune removed files. Reinstall to write one.'
    })
  } else if (sourceRoot) {
    const current = sourceVersion(sourceRoot)
    if (current && receipt.automatonVersion && receipt.automatonVersion !== current) {
      warnings.push({
        level: 'warning',
        code: 'version_drift',
        message: `installed automaton ${receipt.automatonVersion}, this CLI is ${current}: reinstall to refresh installed copies`
      })
    }
  }

  if (sourceRoot) {
    const known = sourceSkillNames(sourceRoot)
    for (const host of HOSTS) {
      const skillRoots = [host.skillRoot, ...(host.legacySkillRoots ?? [])]
      for (const skillRoot of skillRoots) {
        for (const name of installedSkillDirs(join(paths.root, skillRoot))) {
          if (!known.has(name)) {
            const remedy = receipt
              ? 'reinstall to prune it'
              : 'remove it by hand, then reinstall; a receiptless upgrade cannot prune it'
            warnings.push({
              level: 'warning',
              code: 'orphaned_skill',
              message: `${host.id}: installed skill ${skillRoot}/${name} no longer exists in source, ${remedy}`
            })
          }
        }
      }
    }
  }

  return warnings
}
