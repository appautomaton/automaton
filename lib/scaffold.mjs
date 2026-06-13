import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { automatonPaths } from './paths.mjs'
import { relativePathWithin } from './receipt.mjs'

export const STEERING_FILES = {
  'PROJECT.md': '# Project\n\nDescribe the repo and why it exists.\n',
  'REQUIREMENTS.md': '# Requirements\n\nList the accepted product and technical constraints.\n',
  'ROADMAP.md': '# Roadmap\n\nNo active roadmap.\n\nFirst-time onboarding does not create roadmap phases. Refresh imports require strong roadmap evidence and user confirmation in chat.\n\n## Deferred or Not Now\n\n- None recorded.\n'
}

const DEPRECATED_STEERING_FILES = ['STATUS.md']

// When a recorder is passed, every directory creation and steering write is
// recorded into the install receipt so uninstall knows what this scaffold
// actually contributed versus what already existed (DD-011).
export function scaffoldProject(root = '.', recorder = null) {
  const paths = automatonPaths(root)
  const createdFiles = []
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

  for (const name of DEPRECATED_STEERING_FILES) {
    rmSync(join(paths.steeringRoot, name), { force: true })
  }

  for (const [name, content] of Object.entries(STEERING_FILES)) {
    const target = join(paths.steeringRoot, name)
    steeringPaths.push(relativePathWithin(paths.root, target))
    if (!existsSync(target)) {
      writeFileSync(target, content, 'utf8')
      recorder?.recordFile(target, content)
      createdFiles.push(target)
    }
  }

  return {
    ...paths,
    createdFiles,
    steeringPaths
  }
}
