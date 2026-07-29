import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import type { UserStatsDoc, RatingDoc, BadgeDoc, WatchedEpisodeDoc } from '../lib/firebase-queries'

export interface RatingDistItem { rating: number; count: number }

export const BADGE_NAMES: Record<number, string> = {
  1: 'FIRST EPISODE', 2: 'WEEK STREAK', 3: 'MONTH STREAK', 4: 'MOVIE BUFF',
  5: 'SERIES MARATHON', 6: 'EARLY ADOPTER', 7: 'COMPLETIONIST', 8: 'REVIEWER',
  9: 'SOCIAL BUTTERFLY', 10: 'TOP FAN',
}

export async function getUserStats(uid: string) {
  const db = await getDb()
  const _snap = await getDocs(query(collection(db, 'user_stats'), where('user_id', '==', uid), limit(1)))
  const result = _snap.empty ? null : (_snap.docs[0].data() as UserStatsDoc)
  return result ?? ({} as Partial<UserStatsDoc>)
}

export async function getRatingDistribution(uid: string): Promise<RatingDistItem[]> {
  const db = await getDb()
  const _snap = await getDocs(query(collection(db, 'ratings'), where('user_id', '==', uid)))
  const items = _snap.docs.map(d => ({ ...(d.data() as RatingDoc), id: d.id }))
  const dist: Record<number, number> = {}
  items.forEach(r => { const k = Math.floor(r.rating); dist[k] = (dist[k] || 0) + 1 })
  return Object.entries(dist).map(([r, c]) => ({ rating: parseInt(r), count: c })).sort((a, b) => a.rating - b.rating)
}

export async function getShowCount(uid: string) {
  const db = await getDb()
  const _snap2 = await getDocs(query(collection(db, 'followed_shows'), where('user_id', '==', uid)))
  return _snap2.docs.length
}

export async function getBadges(uid: string) {
  const db = await getDb()
  const _snap = await getDocs(query(collection(db, 'badges'), where('user_id', '==', uid), orderBy('badge_id')))
  return _snap.docs.map(d => ({ ...(d.data() as BadgeDoc), id: d.id }))
}

export async function getTodayEpisodeCount(uid: string): Promise<number> {
  const db = await getDb()
  const today = new Date()
  const startStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const _snap = await getDocs(query(collection(db, 'watched_episodes'), where('user_id', '==', uid)))
  const items = _snap.docs.map(d => ({ ...(d.data() as WatchedEpisodeDoc), id: d.id }))
  return items.filter(w => w.watched_at?.startsWith(startStr)).length
}

export async function getStreak(uid: string): Promise<number> {
  const db = await getDb()
  const _snap = await getDocs(query(collection(db, 'watched_episodes'), where('user_id', '==', uid), orderBy('watched_at', 'desc')))
  const items = _snap.docs.map(d => ({ ...(d.data() as WatchedEpisodeDoc), id: d.id }))
  const dates = new Set<string>()
  items.forEach(w => { if (w.watched_at) dates.add(w.watched_at.slice(0, 10)) })
  const sorted = [...dates].sort().reverse()
  if (sorted.length === 0) return 0
  let streak = 1
  const today = new Date()
  const mostRecent = new Date(sorted[0])
  const diffDays = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > 1) return 0
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) streak++
    else break
  }
  return streak
}
