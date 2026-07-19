import { collection, addDoc, getDocs, query, where, limit, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export async function setEmotion(uid: string, episodeId: number, emotionId: string | null) {
  const snap = await getDocs(query(
    collection(db, 'episode_emotions'),
    where('user_id', '==', uid),
    where('episode_id', '==', episodeId),
    limit(1),
  ))
  if (emotionId === null) {
    if (!snap.empty) await deleteDoc(snap.docs[0].ref)
    return
  }
  if (!snap.empty) return
  await addDoc(collection(db, 'episode_emotions'), {
    user_id: uid,
    episode_id: episodeId,
    emotion_id: emotionId,
    created_at: new Date().toISOString(),
  })
}

export async function getEmotionsForShow(uid: string, showId: number): Promise<Map<number, string>> {
  const weSnap = await getDocs(query(
    collection(db, 'watched_episodes'),
    where('user_id', '==', uid),
    where('show_id', '==', showId),
  ))
  const epIds = weSnap.docs.map(d => (d.data() as { episode_id: number }).episode_id)
  if (epIds.length === 0) return new Map()
  const snap = await getDocs(query(
    collection(db, 'episode_emotions'),
    where('user_id', '==', uid),
  ))
  const map = new Map<number, string>()
  snap.forEach(d => {
    const e = d.data() as { episode_id: number; emotion_id: string }
    if (epIds.includes(e.episode_id)) map.set(e.episode_id, e.emotion_id)
  })
  return map
}

export async function getEmotionsForHistory(uid: string): Promise<Map<number, string>> {
  const snap = await getDocs(query(
    collection(db, 'episode_emotions'),
    where('user_id', '==', uid),
  ))
  const map = new Map<number, string>()
  snap.forEach(d => {
    const e = d.data() as { episode_id: number; emotion_id: string }
    map.set(e.episode_id, e.emotion_id)
  })
  return map
}

const EMOTIONS = new Map<string, string>([
  ['happy', 'HA'],
  ['sad', 'SA'],
  ['scared', 'SC'],
  ['angry', 'AN'],
  ['mindblown', 'MB'],
  ['boring', 'BO'],
  ['love', 'LO'],
  ['fire', 'FI'],
  ['party', 'PA'],
  ['star', 'AM'],
])

export function getEmoji(id: string): string {
  return EMOTIONS.get(id) ?? '?'
}
