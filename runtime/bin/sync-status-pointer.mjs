#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_NEXT_STEP, STAGES } from '../lib/contracts.mjs'
import { renderStatusSummary } from '../lib/status.mjs'

function loadCurrentState(target) {
  if (!existsSync(target)) {
    return null
  }

  const parsed = JSON.parse(readFileSync(target, 'utf8'))
  const activeChange = parsed.active_change ?? parsed.activeChange
  const stage = parsed.stage

  if (typeof activeChange !== 'string' || !STAGES.includes(stage)) {
    return null
  }

  return { activeChange, stage }
}

function scaffoldStatus(activeChange, stage) {
  return renderStatusSummary({
    activeChange,
    stage,
    whatIsTrueNow: [],
    nextStep: DEFAULT_NEXT_STEP,
    openRisks: []
  })
}

export function syncStatusPointerFromCurrentState({ currentTarget, statusTarget }) {
  const currentState = loadCurrentState(currentTarget)

  if (currentState === null) {
    return { status: 'skipped' }
  }

  mkdirSync(dirname(statusTarget), { recursive: true })

  if (!existsSync(statusTarget)) {
    writeFileSync(statusTarget, scaffoldStatus(currentState.activeChange, currentState.stage), 'utf8')
    return { status: 'initialized' }
  }

  const source = readFileSync(statusTarget, 'utf8')
  const nextSource = source
    .replace(/^- active change: `[^`]*`$/m, `- active change: \`${currentState.activeChange}\``)
    .replace(/^- current stage: `[^`]*`$/m, `- current stage: \`${currentState.stage}\``)

  if (
    nextSource.includes(`- active change: \`${currentState.activeChange}\``) &&
    nextSource.includes(`- current stage: \`${currentState.stage}\``)
  ) {
    if (nextSource !== source) {
      writeFileSync(statusTarget, nextSource, 'utf8')
      return { status: 'updated' }
    }

    return { status: 'unchanged' }
  }

  writeFileSync(statusTarget, scaffoldStatus(currentState.activeChange, currentState.stage), 'utf8')
  return { status: 'initialized' }
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))) {
  const [currentTarget, statusTarget] = process.argv.slice(2)

  if (currentTarget === undefined || statusTarget === undefined) {
    throw new Error('missing required args: current target status target')
  }

  syncStatusPointerFromCurrentState({ currentTarget, statusTarget })
}
