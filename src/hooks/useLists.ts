import { useState, useEffect, useCallback } from 'react'
import { getUserLists } from '../services/listService'
import type { CustomListDoc } from '../lib/firebase-queries'

export function useLists(uid: string | undefined) {
  const [lists, setLists] = useState<CustomListDoc[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    if (!uid) { setLists([]); setLoading(false); return }
    setLoading(true)
    const data = await getUserLists(uid)
    setLists(data)
    setLoading(false)
  }, [uid])
  useEffect(() => { refresh() }, [refresh])
  return { lists, loading, refresh }
}
