const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  storedAt: number
  ttl: number
}

const store = new Map<string, CacheEntry<unknown>>()

function isExpired(entry: CacheEntry<unknown>, maxAge?: number): boolean {
  const ttl = maxAge ?? entry.ttl
  return Date.now() - entry.storedAt > ttl
}

export function getCached<T>(key: string, maxAge?: number): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined
  if (isExpired(entry, maxAge)) {
    store.delete(key)
    return undefined
  }
  return entry.data
}

/** Returns cached data even if stale (for stale-while-revalidate pattern) */
export function getCachedStale<T>(key: string): { data: T; stale: boolean } | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined
  return { data: entry.data, stale: isExpired(entry) }
}

export function setCached<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  store.set(key, { data, storedAt: Date.now(), ttl })
}

export function hasCached(key: string, maxAge?: number): boolean {
  const entry = store.get(key)
  if (!entry) return false
  return !isExpired(entry, maxAge)
}

/** Invalidate a single cache entry */
export function invalidate(key: string): void {
  store.delete(key)
}

/** Invalidate all entries whose key starts with the given prefix */
export function invalidateByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

export function clearCache(): void {
  store.clear()
}

export function memoize<T, A extends unknown[]>(fn: (...args: A) => Promise<T>, ttlMs = 30_000): (...args: A) => Promise<T> {
  const prefix = `${fn.name}::`
  return async (...args: A) => {
    const key = prefix + JSON.stringify(args)
    const cached = getCached<T>(key, ttlMs)
    if (cached !== undefined) return cached
    const data = await fn(...args)
    setCached(key, data, ttlMs)
    return data
  }
}

export function memoClear(): void {
  store.clear()
}

export function memoClearKey(key: string): void {
  store.delete(key)
}

export function memoSize(): number {
  return store.size
}
