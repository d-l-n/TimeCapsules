import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, arrayUnion, arrayRemove, where, setDoc } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { DEFAULT_LIST_IDS, isDefaultList, type CustomListDoc, type DefaultListId } from '../lib/firebase-queries'

export const DEFAULT_LIST_NAMES: Record<DefaultListId, { en: string; es: string }> = {
  'default-upcoming': { en: 'Upcoming Releases', es: 'Próximos Estrenos' },
  'default-pending': { en: 'To Watch', es: 'Por Ver' },
  'default-inprogress': { en: 'In Progress', es: 'En Curso' },
  'default-uptodate': { en: 'Up to Date', es: 'Al Día' },
  'default-finished': { en: 'Finished', es: 'Finalizados' },
}

export function getListDisplayName(list: CustomListDoc, lang: 'en' | 'es'): string {
  if (isDefaultList(list.id) && list.id in DEFAULT_LIST_NAMES) {
    return DEFAULT_LIST_NAMES[list.id as DefaultListId][lang]
  }
  return list.name
}

export async function createList(uid: string, name: string, description: string): Promise<string> {
  const db = await getDb()
  const ref = await addDoc(collection(db, 'custom_lists'), { user_id: uid, name, description, show_ids: [], createdAt: new Date().toISOString() })
  return ref.id
}

export async function updateList(id: string, data: Partial<Pick<CustomListDoc, 'name' | 'description'>>) {
  const db = await getDb()
  if (isDefaultList(id)) return
  await updateDoc(doc(db, 'custom_lists', id), data)
}

export async function deleteList(id: string) {
  const db = await getDb()
  if (isDefaultList(id)) return
  await deleteDoc(doc(db, 'custom_lists', id))
}

export async function emptyList(id: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'custom_lists', id), { show_ids: [] })
}

export interface DefaultListSeed {
  pending: number[]
  inprogress: number[]
  finished: number[]
  uptodate: number[]
  upcoming: number[]
}

export async function syncDefaultLists(uid: string, seed: DefaultListSeed) {
  const db = await getDb()
  const _snap = await getDocs(query(collection(db, 'custom_lists'), where('user_id', '==', uid)))
  const existing = _snap.docs.map(d => ({ ...(d.data() as CustomListDoc), id: d.id }))
  const byId = new Map(existing.map(l => [l.id, l]))
  const map: Record<DefaultListId, number[]> = {
    'default-pending': seed.pending,
    'default-finished': seed.finished,
    'default-uptodate': seed.uptodate,
    'default-upcoming': seed.upcoming,
    'default-inprogress': seed.inprogress,
  }
  await Promise.all(DEFAULT_LIST_IDS.map(id => {
    const l = byId.get(id)
    if (l && !l.seeded && l.show_ids.length === 0 && map[id].length > 0) {
      return updateDoc(doc(db, 'custom_lists', id), { show_ids: map[id], seeded: true })
    }
    return Promise.resolve()
  }))
}

export async function ensureDefaultLists(uid: string, lang: 'en' | 'es' = 'en') {
  const db = await getDb()
  const _snap = await getDocs(query(collection(db, 'custom_lists'), where('user_id', '==', uid)))
  const existing = _snap.docs.map(d => ({ ...(d.data() as CustomListDoc), id: d.id }))
  const have = new Set(existing.map(l => l.id))
  await Promise.all(DEFAULT_LIST_IDS.filter(id => !have.has(id)).map(id =>
    setDoc(doc(db, 'custom_lists', id), {
      user_id: uid,
      name: DEFAULT_LIST_NAMES[id][lang],
      description: '',
      show_ids: [],
      createdAt: new Date().toISOString(),
      is_default: true,
    })
  ))
}

export async function getUserLists(uid: string): Promise<CustomListDoc[]> {
  const db = await getDb()
  const _snap = await getDocs(query(collection(db, 'custom_lists'), where('user_id', '==', uid)))
  return _snap.docs.map(d => ({ ...(d.data() as CustomListDoc), id: d.id }))
}

export async function getList(id: string): Promise<CustomListDoc | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, 'custom_lists', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } as CustomListDoc : null
}

export async function addShowToList(listId: string, showId: number) {
  const db = await getDb()
  await updateDoc(doc(db, 'custom_lists', listId), { show_ids: arrayUnion(showId) })
}

export async function removeShowFromList(listId: string, showId: number) {
  const db = await getDb()
  await updateDoc(doc(db, 'custom_lists', listId), { show_ids: arrayRemove(showId) })
}
