import { join, resolve } from 'node:path'

export function automatonPaths(root = '.') {
  const resolvedRoot = resolve(root)
  const agentRoot = join(resolvedRoot, '.agent')
  const runtimeRoot = join(agentRoot, '.automaton')

  return {
    root: resolvedRoot,
    agentRoot,
    runtimeRoot,
    steeringRoot: join(agentRoot, 'steering'),
    wikiRoot: join(agentRoot, 'wiki'),
    workRoot: join(agentRoot, 'work')
  }
}
