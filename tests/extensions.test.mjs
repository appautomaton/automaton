import test from 'node:test'
import assert from 'node:assert/strict'

import { createExtensionRegistry } from '../lib/extensions.mjs'

test('extension registry is empty by default and runs registered hooks in order', async () => {
  const registry = createExtensionRegistry()
  const seen = []

  assert.deepEqual(registry.list('postInit'), [])

  registry.register('postInit', async (context) => {
    seen.push(`first:${context.stage}`)
  })
  registry.register('postInit', async (context) => {
    seen.push(`second:${context.stage}`)
  })

  await registry.run('postInit', { stage: 'frame' })
  assert.deepEqual(seen, ['first:frame', 'second:frame'])
})

test('extension registry list returns a copy instead of the live handler array', async () => {
  const registry = createExtensionRegistry()
  const seen = []

  registry.register('postInit', async (context) => {
    seen.push(`registered:${context.stage}`)
  })

  const handlers = registry.list('postInit')
  handlers.push(async (context) => {
    seen.push(`mutated:${context.stage}`)
  })

  await registry.run('postInit', { stage: 'verify' })

  assert.deepEqual(seen, ['registered:verify'])
  assert.equal(registry.list('postInit').length, 1)
})
