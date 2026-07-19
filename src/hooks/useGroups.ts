import { useEffect, useState, useCallback } from 'react'
import { getUserGroups, getGroupMembers, getGroupShows, getGroupEpisodeProgress } from '../services/groupService'
import { getCached, setCached } from '../lib/hook-cache'
import type { GroupWithMeta, MemberWithProfile, GroupEpisodeProgress } from '../services/groupService'

export type { GroupWithMeta, MemberWithProfile, GroupEpisodeProgress }

export function useGroups(uid: string | undefined) {
  const cacheKey = `groups:${uid}`
  const cached = getCached<GroupWithMeta[]>(cacheKey)

  const [groups, setGroups] = useState<GroupWithMeta[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)

  const fetchGroups = useCallback(async (setLoadingState?: boolean) => {
    if (!uid) return
    if (setLoadingState && !getCached(cacheKey)) setLoading(true)
    const g = await getUserGroups(uid)
    setGroups(g)
    setCached(cacheKey, g)
    if (setLoadingState) setLoading(false)
  }, [uid, cacheKey])

  useEffect(() => { fetchGroups(true) }, [fetchGroups])

  return { groups, loading, refresh: () => fetchGroups() }
}

export function useGroupMembers(groupId: string | undefined) {
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    ;(async () => {
      const m = await getGroupMembers(groupId)
      setMembers(m)
      setLoading(false)
    })()
  }, [groupId])

  return { members, loading }
}

export function useGroupShows(groupId: string | undefined) {
  const [shows, setShows] = useState<(import('../lib/firebase-queries').ShowDoc & { show_id: number })[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const s = await getGroupShows(groupId)
    setShows(s)
    setLoading(false)
  }, [groupId])

  useEffect(() => { refresh() }, [refresh])

  return { shows, loading, refresh }
}

export function useGroupProgress(groupId: string | undefined, showId: number | undefined) {
  const [progress, setProgress] = useState<GroupEpisodeProgress[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!groupId || !showId) return
    setLoading(true)
    const p = await getGroupEpisodeProgress(groupId, showId)
    setProgress(p)
    setLoading(false)
  }, [groupId, showId])

  useEffect(() => { refresh() }, [refresh])

  return { progress, loading, refresh }
}
