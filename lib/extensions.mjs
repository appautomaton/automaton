export function createExtensionRegistry() {
  const hooks = new Map()

  return {
    register(hookName, handler) {
      const current = hooks.get(hookName) ?? []
      hooks.set(hookName, [...current, handler])
    },
    list(hookName) {
      return [...(hooks.get(hookName) ?? [])]
    },
    async run(hookName, context) {
      for (const handler of hooks.get(hookName) ?? []) {
        await handler(context)
      }
    }
  }
}
