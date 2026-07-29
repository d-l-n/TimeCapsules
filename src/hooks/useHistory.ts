import { useEffect, useState } from 'react'
import { getWatchHistory } from '../services/historyService'
import { getCached, setCached } from '../lib/hook-cache'
import type { HistoryItem } from '../services/historyService'

export type { HistoryItem }

export function useHistory(uid: string | undefined) {
  const cacheKey = `history:${uid}`
  const cached = getCached<{ entries: HistoryItem[]; months: string[] }>(cacheKey)

  const [entries, setEntries] = useState<HistoryItem[]>(cached?.entries ?? [])
  const [months, setMonths] = useState<string[]>(cached?.months ?? [])
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (!uid) return
    if (cached) { setLoading(false); return }

    ;(async () => {
      const result = await getWatchHistory(uid)
      setEntries(result.entries)
      setMonths(result.months)
      setCached(cacheKey, { entries: result.entries, months: result.months })
      setLoading(false)
    })()
  }, [uid, cacheKey, cached])

  return { entries, months, loading }
}
