import {
  collection,
  query,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  limit,
  type QueryConstraint,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'
import type { ShowDoc } from './firebase-queries'
import { memento, mementoClearKey } from './memento'

/**
 * Fetch multiple documents from a collection with optional constraints.
 */
export async function findMany<T = DocumentData>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<(T & { id?: string })[]> {
  const snap = await getDocs(query(collection(db, collectionName), ...constraints))
  return snap.docs.map(d => ({ ...(d.data() as T), id: d.id }))
}

/**
 * Find a single document by constraints. Returns null if not found.
 */
export async function findOne<T = DocumentData>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<T | null> {
  const snap = await getDocs(query(collection(db, collectionName), ...constraints, limit(1)))
  return snap.empty ? null : (snap.docs[0].data() as T)
}

/**
 * Find a single document and return it with its Firestore id.
 */
export async function findOneWithId<T = DocumentData>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<{ id: string; data: T } | null> {
  const snap = await getDocs(query(collection(db, collectionName), ...constraints, limit(1)))
  if (snap.empty) return null
  return { id: snap.docs[0].id, data: snap.docs[0].data() as T }
}

/**
 * Check if at least one document exists matching the constraints.
 */
export async function exists(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<boolean> {
  const snap = await getDocs(query(collection(db, collectionName), ...constraints, limit(1)))
  return !snap.empty
}

/**
 * Delete the first document matching the constraints. Returns whether anything was deleted.
 */
export async function deleteOne(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<boolean> {
  const snap = await getDocs(query(collection(db, collectionName), ...constraints, limit(1)))
  if (snap.empty) return false
  await deleteDoc(snap.docs[0].ref)
  return true
}

export async function deleteMany(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<number> {
  const snap = await getDocs(query(collection(db, collectionName), ...constraints))
  if (snap.empty) return 0
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  return snap.size
}

/**
 * Upsert: find an existing document by constraints, then either update it (setDoc)
 * or create a new one (addDoc). Returns the document id and whether it already existed.
 */
export async function upsertDoc<T extends Record<string, unknown>>(
  collectionName: string,
  constraints: QueryConstraint[],
  data: T,
): Promise<{ id: string; existed: boolean }> {
  const snap = await getDocs(query(collection(db, collectionName), ...constraints, limit(1)))
  if (snap.empty) {
    const ref = await addDoc(collection(db, collectionName), data)
    return { id: ref.id, existed: false }
  }
  await setDoc(snap.docs[0].ref, data)
  return { id: snap.docs[0].id, existed: true }
}

/**
 * Fetch shows from Firestore and build a Map<number, ShowDoc> keyed by tmdb_id.
 */
async function fetchShowsMap(): Promise<Map<number, ShowDoc>> {
  const snap = await getDocs(collection(db, 'shows'))
  const map = new Map<number, ShowDoc>()
  snap.forEach(d => {
    const s = d.data() as ShowDoc
    if (s.tmdb_id) map.set(s.tmdb_id, s)
  })
  return map
}

/**
 * Build a Map<number, ShowDoc> from the 'shows' collection keyed by tmdb_id,
 * with a 60-second TTL cache.
 */
export const buildShowsMap = memento(fetchShowsMap, 60_000)

export function clearShowsMapCache() {
  mementoClearKey('fetchShowsMap::[]')
}


