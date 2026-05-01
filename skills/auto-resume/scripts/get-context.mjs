#!/usr/bin/env node
/**
 * get-context.mjs
 *
 * Reads the Automaton current state and outputs normalized camelCase JSON.
 * If current.json does not exist, returns the same deterministic key shape with
 * activeChange/stage set to "none" and canonical/review pointers set to null.
 *
 * Usage: node get-context.mjs [path/to/current.json]
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_STATE = {
  activeChange: 'none',
  stage: 'none',
  canonicalSpec: null,
  canonicalDesign: null,
  canonicalPlan: null,
  productReview: null,
  engineeringReview: null
}

const target = process.argv[2] ?? join('.agent', '.automaton', 'state', 'current.json')

if (!existsSync(target)) {
  console.log(JSON.stringify(DEFAULT_STATE, null, 2))
  process.exit(0)
}

try {
  const raw = readFileSync(target, 'utf8')
  const parsed = JSON.parse(raw)

  // Normalize snake_case to camelCase for agent consumption
  const normalized = {
    activeChange: parsed.active_change ?? parsed.activeChange ?? DEFAULT_STATE.activeChange,
    stage: parsed.stage ?? DEFAULT_STATE.stage,
    canonicalSpec: parsed.canonical_spec ?? parsed.canonicalSpec ?? null,
    canonicalDesign: parsed.canonical_design ?? parsed.canonicalDesign ?? null,
    canonicalPlan: parsed.canonical_plan ?? parsed.canonicalPlan ?? null,
    productReview: parsed.product_review ?? parsed.productReview ?? null,
    engineeringReview: parsed.engineering_review ?? parsed.engineeringReview ?? null,
    ...Object.fromEntries(
      Object.entries(parsed).filter(
        ([key]) => ![
          'active_change', 'activeChange',
          'stage',
          'canonical_spec', 'canonicalSpec',
          'canonical_design', 'canonicalDesign',
          'canonical_plan', 'canonicalPlan',
          'product_review', 'productReview',
          'engineering_review', 'engineeringReview'
        ].includes(key)
      )
    )
  }

  console.log(JSON.stringify(normalized, null, 2))
} catch (err) {
  console.error(JSON.stringify({ error: err.message, path: target }))
  process.exit(1)
}
