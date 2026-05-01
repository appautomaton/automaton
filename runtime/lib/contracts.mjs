export const STAGES = ['frame', 'plan', 'execute', 'verify', 'resume']

export const LENSES = ['product', 'engineering', 'design', 'security', 'runtime']

export const ARTIFACT_LAYOUT = {
  agentRoot: '.agent',
  runtimeRoot: '.agent/.automaton',
  steeringDir: 'steering',
  wikiDir: 'wiki',
  workDir: 'work'
}

export function isValidStage(stage) {
  return STAGES.includes(stage)
}

export function isValidLens(lens) {
  return LENSES.includes(lens)
}
