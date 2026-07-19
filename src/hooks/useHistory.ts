import { useEffect, useState } from 'react'
import { getWatchHistory } from '../services/historyService'
import type { HistoryItem } from '../services/historyService'

export type { HistoryItem }

export function useHistory(uid: string | undefined) {
  const [entries, setEntries] = useState<HistoryItem[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    ;(async () => {
      const result = await getWatchHistory(uid)
      setEntries(result.entries)
      setMonths(result.months)
      setLoading(false)
    })()
  }, [uid])

  return { entries, months, loading }
}
