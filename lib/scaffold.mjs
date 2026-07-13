import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { automatonPaths } from './paths.mjs'
import { hashContent, hashFile, relativePathWithin } from './receipt.mjs'

export const STEERING_FILES = {
  'PROJECT.md': '# Project\n\nDescribe the repo and why it exists.\n',
  'REQUIREMENTS.md': '# Requirements\n\nList the accepted product and technical constraints.\n',
  'ROADMAP.md': '# Roadmap\n\nNo active roadmap.\n\nFirst-time onboarding does not create roadmap phases. Refresh imports require strong roadmap evidence and user confirmation in chat.\n\n## Deferred or Not Now\n\n- None recorded.\n'
}

// Deprecated steering removal follows the same DD-011 asymmetry rule as every
// other `.agent/` deletion: only a hash-pristine placeholder may go, because
// a file the user or onboarding touched is project history. The values are
// every placeholder body a past version ever scaffolded.
const DEPRECATED_STEERING_FILES = {
  'STATUS.md': [
    '# Status\n\nRecord the active change, stage, and next step.\n',
    '# Status\n\n## What Is True Now\n\n- none recorded\n\n## Next Step\n\nRun `auto-onboard` to refresh project truth for the repository before continuing.\n\n## Open Risks\n\n- none recorded\n'
  ]
}

// When a recorder is passed, every directory creation and steering write is
// recorded into the install receipt so uninstall knows what this scaffold
// actually contributed versus what already existed (DD-011).
export function scaffoldProject(root = '.', recorder = null) {
  const paths = automatonPaths(root)
  const steeringPaths = []
  const ensureDir = (directory) => {
    if (recorder) {
      recorder.ensureDir(directory)
    } else {
      mkdirSync(directory, { recursive: true })
    }
  }

  ;[
    paths.steeringRoot,
    paths.wikiRoot,
    paths.workRoot,
    join(paths.runtimeRoot, 'lib'),
    join(paths.runtimeRoot, 'scripts'),
    join(paths.runtimeRoot, 'config'),
    join(paths.runtimeRoot, 'state'),
    join(paths.runtimeRoot, 'cache'),
    join(paths.runtimeRoot, 'logs')
  ].forEach(ensureDir)

  for (const [name, pristineContents] of Object.entries(DEPRECATED_STEERING_FILES)) {
    const target = join(paths.steeringRoot, name)
    if (!existsSync(target)) {
      continue
    }
    const currentHash = hashFile(target)
    if (pristineContents.some((content) => hashContent(content) === currentHash)) {
      rmSync(target, { force: true })
    } else {
      recorder?.warn(
        'kept_modified_file',
        `${relativePathWithin(paths.root, target)} is deprecated but was modified after install and was kept`
      )
    }
  }

  for (const [name, content] of Object.entries(STEERING_FILES)) {
    const target = join(paths.steeringRoot, name)
    steeringPaths.push(relativePathWithin(paths.root, target))
    if (!existsSync(target)) {
      writeFileSync(target, content, 'utf8')
      recorder?.recordFile(target, content)
    }
  }

  return {
    ...paths,
    steeringPaths
  }
}
