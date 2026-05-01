#!/usr/bin/env node
import { existsSync } from 'node:fs'

import { loadCurrentState, saveCurrentState } from '../lib/state.mjs'

const [target, activeChange, stage] = process.argv.slice(2)

if (target === undefined || activeChange === undefined || stage === undefined) {
  throw new Error('missing required args: target active change stage')
}

const currentState = existsSync(target) ? loadCurrentState(target) : {}

saveCurrentState(target, { ...currentState, activeChange, stage })
