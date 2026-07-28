import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { automatonPaths } from './paths.mjs'
import { loadReceipt, receiptOwners, warning } from './receipt.mjs'
import { RETIRED_SKILLS } from './install.mjs'
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

// Only skills automaton is known to have shipped and retired are drift. A name
// that is neither current nor retired is a user skill that happens to start with
// `auto-`, and the installer will never touch it, so reporting it would be noise
// the reader learns to skip.
function installedRetiredSkillDirs(skillRoot) {
  if (!existsSync(skillRoot)) {
    return []
  }
  return readdirSync(skillRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && RETIRED_SKILLS.includes(entry.name))
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
    warnings.push(warning(
      'missing_receipt',
      'no install receipt: this install predates receipt tracking, so upgrades cannot prune removed files. Reinstall to write one.'
    ))
  } else if (sourceRoot) {
    const current = sourceVersion(sourceRoot)
    // Hosts install independently, so version skew is per owner: installing
    // codex at 0.4 must not hide that claude's copies are still 0.3. The scan
    // covers every owner the receipt holds entries for: an owner with entries
    // but no record was installed by a pre-stamp version and is reported as
    // unrecorded, never assumed current. A receipt with no records at all was
    // last written wholesale by one pre-stamp CLI, where the global
    // comparison is exact.
    if (current && Object.keys(receipt.owners).length > 0) {
      const ownerNames = [...new Set([...Object.keys(receipt.owners), ...receiptOwners(receipt)])].sort()
      for (const owner of ownerNames) {
        const installed = receipt.owners[owner]?.automatonVersion
        if (installed === current) {
          continue
        }
        const provenance = installed ? `installed automaton ${installed}` : 'installed automaton (version unrecorded)'
        const remedy = owner === 'project'
          ? 'reinstall to refresh the shared runtime'
          : `reinstall --${owner} to refresh its copies`
        warnings.push(warning('version_drift', `${provenance} for ${owner}, this CLI is ${current}: ${remedy}`))
      }
    } else if (current && receipt.automatonVersion && receipt.automatonVersion !== current) {
      warnings.push(warning(
        'version_drift',
        `installed automaton ${receipt.automatonVersion}, this CLI is ${current}: reinstall to refresh installed copies`
      ))
    }
  }

  // The remedy is unconditional now: pruning is by name (DD-020), so a reinstall
  // removes the orphan whether or not any receipt ever recorded it.
  for (const host of HOSTS) {
    const skillRoots = [host.skillRoot, ...(host.legacySkillRoots ?? [])]
    for (const skillRoot of skillRoots) {
      for (const name of installedRetiredSkillDirs(join(paths.root, skillRoot))) {
        warnings.push(warning(
          'orphaned_skill',
          `${host.id}: installed skill ${skillRoot}/${name} is retired, reinstall to prune it`
        ))
      }
    }
  }

  return warnings
}
