type CacheEntry<T> = { data: T; at: number }
const store = new Map<string, CacheEntry<unknown>>()

export function memento<T, A extends unknown[]>(fn: (...args: A) => Promise<T>, ttlMs = 30_000): (...args: A) => Promise<T> {
  return async (...args: A) => {
    const key = `${fn.name}::${JSON.stringify(args)}`
    const now = Date.now()
    const entry = store.get(key) as CacheEntry<T> | undefined
    if (entry && now - entry.at < ttlMs) return entry.data
    const data = await fn(...args)
    store.set(key, { data, at: now })
    return data
  }
}

export function mementoClear() {
  store.clear()
}

export function mementoClearKey(key: string) {
  store.delete(key)
}

export function mementoSize() {
  return store.size
}
