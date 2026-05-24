import { join, resolve } from 'node:path'

import { ARTIFACT_LAYOUT } from './contracts.mjs'

export function automatonPaths(root = '.') {
  const resolvedRoot = resolve(root)
  const agentRoot = join(resolvedRoot, ARTIFACT_LAYOUT.agentRoot)
  const runtimeRoot = join(resolvedRoot, ARTIFACT_LAYOUT.runtimeRoot)

  return {
    root: resolvedRoot,
    agentRoot,
    runtimeRoot,
    sharedReferencesRoot: join(runtimeRoot, 'references'),
    sharedScriptsRoot: join(runtimeRoot, 'scripts'),
    steeringRoot: join(agentRoot, ARTIFACT_LAYOUT.steeringDir),
    wikiRoot: join(agentRoot, ARTIFACT_LAYOUT.wikiDir),
    workRoot: join(agentRoot, ARTIFACT_LAYOUT.workDir)
  }
}
