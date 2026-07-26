import { useEffect, useState } from 'react'
import { getWatchHistory } from '../services/historyService'
import { getDevSimState } from '../lib/dev-simulation-types'
import type { HistoryItem } from '../services/historyService'

export type { HistoryItem }

export function useHistory(uid: string | undefined) {
  const [entries, setEntries] = useState<HistoryItem[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return

    const sim = getDevSimState()

    // Simulate empty state
    if (sim.simulateEmptyState) {
      setEntries([])
      setMonths([])
      setLoading(false)
      return
    }

    // Simulate high-volume power user
    if (sim.simulateHighVolume) {
      const mockEntries: HistoryItem[] = []
      const monthSet = new Set<string>()
      const showNames = ['Stranger Things', 'Breaking Bad', 'The Office', 'Game of Thrones', 'Dark', 'Mindhunter', 'Ozark', 'The Crown', 'Black Mirror', 'Westworld']
      const now = Date.now()
      for (let i = 0; i < 250; i++) {
        const daysAgo = Math.floor(Math.random() * 365)
        const d = new Date(now - daysAgo * 86400000)
        monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        mockEntries.push({
          id: -i - 1,
          watched_at: d.toISOString(),
          episode_number: (i % 20) + 1,
          season_number: Math.floor(i / 20) + 1,
          show_name: showNames[i % showNames.length],
          show_id: 1000 + (i % 10),
        })
      }
      mockEntries.sort((a, b) => b.watched_at.localeCompare(a.watched_at))
      setEntries(mockEntries)
      setMonths([...monthSet].sort().reverse())
      setLoading(false)
      return
    }

    // Real data
    ;(async () => {
      const result = await getWatchHistory(uid)
      setEntries(result.entries)
      setMonths(result.months)
      setLoading(false)
    })()
  }, [uid])

  return { entries, months, loading }
}
