import { addDoc, updateDoc, doc, collection, where, orderBy, limit, getDocs, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { findMany } from '../lib/firestore-utils'
import { getFollowedActiveShows } from './showService'
import { getTmdbDetailsAuto } from './tmdb'
import type { NotificationDoc } from '../lib/firebase-queries'

export async function getNotifications(uid: string): Promise<NotificationDoc[]> {
  return findMany<NotificationDoc>('notifications', where('user_id', '==', uid), orderBy('created_at', 'desc'), limit(20))
}

export async function getUnreadCount(uid: string): Promise<number> {
  const items = await findMany<NotificationDoc>('notifications', where('user_id', '==', uid), where('read', '==', false))
  return items.length
}

export async function markAsRead(id: string) {
  await updateDoc(doc(db, 'notifications', id), { read: true })
}

export async function markAllAsRead(uid: string) {
  // Needs doc IDs, so uses a manual query (findMany doesn't return doc refs)
  const snap = await getDocs(query(collection(db, 'notifications'), where('user_id', '==', uid), where('read', '==', false)))
  await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { read: true })))
}

async function createNotification(uid: string, type: NotificationDoc['type'], title: string, body: string, showId?: number) {
  await addDoc(collection(db, 'notifications'), {
    user_id: uid,
    type,
    title,
    body,
    show_id: showId ?? null,
    read: false,
    created_at: new Date().toISOString(),
  })
}

export async function checkUpcomingEpisodes(uid: string) {
  const shows = await getFollowedActiveShows(uid)
  const now = new Date()
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const existingNotifications = await findMany<NotificationDoc>('notifications', where('user_id', '==', uid), where('type', '==', 'upcoming_episode'), limit(50))
  const existingKeys = new Set(existingNotifications.map(n => n.show_id))

  for (const show of shows) {
    if (!show.tmdb_id) continue
    if (existingKeys.has(show.id)) continue
    try {
      const auto = await getTmdbDetailsAuto(show.tmdb_id)
      const next = (auto?.details as any)?.next_episode_to_air
      if (!next?.air_date) continue
      const airDate = new Date(next.air_date)
      if (airDate >= now && airDate <= in7d) {
        const days = Math.ceil((airDate.getTime() - now.getTime()) / 86400000)
        const label = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
        await createNotification(uid, 'upcoming_episode',
          `Next episode of ${show.name}`,
          `S${next.season_number}E${next.episode_number} airs ${label}`,
          show.id
        )
      }
    } catch { /* ignore TMDB errors */ }
  }
}
