import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { automatonPaths } from './paths.mjs'

export const STEERING_FILES = {
  'PROJECT.md': '# Project\n\nDescribe the repo and why it exists.\n',
  'REQUIREMENTS.md': '# Requirements\n\nList the accepted product and technical constraints.\n',
  'ROADMAP.md': '# Roadmap\n\nNo roadmap phases yet.\n\nFirst-time onboarding does not create roadmap phases. On refresh, update phases only after strong roadmap evidence and user confirmation in chat.\n\n## Deferred or Not Now\n\n- None recorded.\n',
  'STATUS.md': '# Status\n\n## What Is True Now\n\n- none recorded\n\n## Next Step\n\nRun `auto-onboard` to refresh project truth for the repository before continuing.\n\n## Open Risks\n\n- none recorded\n'
}

export function scaffoldProject(root = '.') {
  const paths = automatonPaths(root)
  const createdFiles = []

  ;[
    paths.steeringRoot,
    paths.wikiRoot,
    paths.workRoot,
    join(paths.runtimeRoot, 'bin'),
    join(paths.runtimeRoot, 'lib'),
    join(paths.runtimeRoot, 'scripts'),
    join(paths.runtimeRoot, 'config'),
    join(paths.runtimeRoot, 'state'),
    join(paths.runtimeRoot, 'cache'),
    join(paths.runtimeRoot, 'logs')
  ].forEach((directory) => mkdirSync(directory, { recursive: true }))

  for (const [name, content] of Object.entries(STEERING_FILES)) {
    const target = join(paths.steeringRoot, name)
    if (!existsSync(target)) {
      writeFileSync(target, content, 'utf8')
      createdFiles.push(target)
    }
  }

  return {
    ...paths,
    createdFiles
  }
}
