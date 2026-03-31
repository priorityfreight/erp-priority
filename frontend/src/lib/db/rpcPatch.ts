export function buildRpcPatch<T extends Record<string, unknown>>(changes: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined)
  )
}
