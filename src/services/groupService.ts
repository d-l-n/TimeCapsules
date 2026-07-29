import { collection, query, where, getDocs, addDoc, doc, getDoc, writeBatch, onSnapshot, setDoc, deleteDoc, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { buildShowsMap } from './showService'
import { toggleWatchedEpisode } from './showService'
import type { GroupDoc, GroupMemberDoc, GroupShowDoc, ShowDoc, WatchedEpisodeDoc, GroupWatchEventDoc } from '../lib/firebase-queries'

export interface GroupWithMeta {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  member_count: number
}

export interface MemberWithProfile {
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  display_name?: string
  photo_url?: string
}

export interface GroupEpisodeProgress {
  episode_id: number
  user_ids: string[]
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createGroup(uid: string, name: string): Promise<string> {
  const invite_code = generateInviteCode()
  const batch = writeBatch(db)
  const groupRef = doc(collection(db, 'groups'))
  batch.set(groupRef, {
    name,
    invite_code,
    created_by: uid,
    created_at: new Date().toISOString(),
  })
  const memberRef = doc(collection(db, 'group_members'))
  batch.set(memberRef, {
    group_id: groupRef.id,
    user_id: uid,
    role: 'admin',
    joined_at: new Date().toISOString(),
  })
  await batch.commit()
  return groupRef.id
}

export async function joinGroupByCode(uid: string, inviteCode: string): Promise<string | null> {
  const gSnap = await getDocs(query(collection(db, 'groups'), where('invite_code', '==', inviteCode), limit(1)))
  if (gSnap.empty) return null
  const groupId = gSnap.docs[0].id
  const mSnap = await getDocs(query(collection(db, 'group_members'), where('group_id', '==', groupId), where('user_id', '==', uid), limit(1)))
  if (!mSnap.empty) return groupId
  await addDoc(collection(db, 'group_members'), {
    group_id: groupId,
    user_id: uid,
    role: 'member',
    joined_at: new Date().toISOString(),
  })
  return groupId
}

export async function getUserGroups(uid: string): Promise<GroupWithMeta[]> {
  const mSnap = await getDocs(query(collection(db, 'group_members'), where('user_id', '==', uid)))
  const memberItems = mSnap.docs.map(d => ({ ...(d.data() as GroupMemberDoc), id: d.id }))
  if (memberItems.length === 0) return []
  const groups: GroupWithMeta[] = []
  for (const m of memberItems) {
    const gSnap = await getDoc(doc(db, 'groups', m.group_id))
    if (!gSnap.exists()) continue
    const g = gSnap.data() as GroupDoc
    const mSnap = await getDocs(query(collection(db, 'group_members'), where('group_id', '==', m.group_id)))
    groups.push({ id: gSnap.id, name: g.name, invite_code: g.invite_code, created_by: g.created_by, created_at: g.created_at, member_count: mSnap.size })
  }
  return groups.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getGroupMembers(groupId: string): Promise<MemberWithProfile[]> {
  const mSnap = await getDocs(query(collection(db, 'group_members'), where('group_id', '==', groupId)))
  const items = mSnap.docs.map(d => ({ ...(d.data() as GroupMemberDoc), id: d.id }))
  const members = items.map(m => ({ user_id: m.user_id, role: m.role, joined_at: m.joined_at }))
  const uids = members.map(m => m.user_id)
  const profiles = await getUserProfiles(uids)
  return members.map(m => ({
    ...m,
    display_name: profiles.get(m.user_id)?.display_name,
    photo_url: profiles.get(m.user_id)?.photo_url,
  }))
}

export async function getUserProfiles(uids: string[]): Promise<Map<string, { display_name: string; photo_url: string }>> {
  if (uids.length === 0) return new Map()
  const result = new Map<string, { display_name: string; photo_url: string }>()
  const snapshots = await Promise.allSettled(uids.map(uid => getDoc(doc(db, 'user_profiles', uid))))
  snapshots.forEach((res, i) => {
    if (res.status === 'fulfilled' && res.value.exists()) {
      const data = res.value.data()
      result.set(uids[i], {
        display_name: data.display_name || '',
        photo_url: data.photo_url || '',
      })
    }
  })
  return result
}

export async function saveUserProfile(uid: string, displayName: string, photoURL: string) {
  await setDoc(doc(db, 'user_profiles', uid), {
    display_name: displayName,
    photo_url: photoURL,
    updated_at: new Date().toISOString(),
  }, { merge: true })
}

export async function addShowToGroup(groupId: string, showId: number, uid: string) {
  const existing = await getDocs(query(collection(db, 'group_shows'), where('group_id', '==', groupId), where('show_id', '==', showId), limit(1)))
  if (!existing.empty) return
  await addDoc(collection(db, 'group_shows'), {
    group_id: groupId,
    show_id: showId,
    added_by: uid,
    added_at: new Date().toISOString(),
  })
}

export async function getGroupShows(groupId: string): Promise<(ShowDoc & { show_id: number })[]> {
  const [showsMap, gsSnap] = await Promise.all([
    buildShowsMap(),
    getDocs(query(collection(db, 'group_shows'), where('group_id', '==', groupId))),
  ])
  const gsItems = gsSnap.docs.map(d => ({ ...(d.data() as GroupShowDoc), id: d.id }))
  return gsItems.map(g => ({ ...showsMap.get(g.show_id)!, show_id: g.show_id })).filter(Boolean)
}

export async function getGroupEpisodeProgress(groupId: string, showId: number): Promise<GroupEpisodeProgress[]> {
  const members = await getGroupMembers(groupId)
  const userIds = members.map(m => m.user_id)
  if (userIds.length === 0) return []
  const weSnap = await getDocs(query(collection(db, 'watched_episodes'), where('show_id', '==', showId)))
  const weItems = weSnap.docs.map(d => ({ ...(d.data() as WatchedEpisodeDoc), id: d.id }))
  const progressMap = new Map<number, string[]>()
  weItems.forEach(w => {
    if (userIds.includes(w.user_id)) {
      const arr = progressMap.get(w.episode_id)
      if (!arr) {
        progressMap.set(w.episode_id, [w.user_id])
      } else if (!arr.includes(w.user_id)) {
        arr.push(w.user_id)
      }
    }
  })
  return Array.from(progressMap.entries()).map(([episode_id, user_ids]) => ({ episode_id, user_ids }))
}

export async function removeShowFromGroup(groupId: string, showId: number) {
  const snap = await getDocs(query(collection(db, 'group_shows'), where('group_id', '==', groupId), where('show_id', '==', showId)))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

export async function leaveGroup(groupId: string, uid: string) {
  const snap = await getDocs(query(collection(db, 'group_members'), where('group_id', '==', groupId), where('user_id', '==', uid)))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

export async function createGroupWatchEvent(groupId: string, episodeId: number, showId: number, uid: string) {
  await addDoc(collection(db, 'group_watch_events'), {
    group_id: groupId,
    episode_id: episodeId,
    show_id: showId,
    marked_by: uid,
    created_at: new Date().toISOString(),
  })
}

/** Set of show IDs (movies) the given user has marked watched in the group */
export async function getGroupMoviesWatched(uid: string, showIds: number[]): Promise<Set<number>> {
  const watched = new Set<number>()
  if (showIds.length === 0) return watched
  // Firestore 'in' supports at most 10 values, so chunk into batches
  const chunkSize = 10
  const batches: Promise<(WatchedEpisodeDoc & { id: string })[]>[] = []
  for (let i = 0; i < showIds.length; i += chunkSize) {
    const chunk = showIds.slice(i, i + chunkSize)
    batches.push(
      getDocs(query(collection(db, 'watched_episodes'), where('user_id', '==', uid), where('show_id', 'in', chunk)))
        .then(snap => snap.docs.map(d => ({ ...(d.data() as WatchedEpisodeDoc), id: d.id })))
    )
  }
  const results = await Promise.all(batches)
  results.forEach(items => {
    items.forEach(w => {
      if (w.episode_id === w.show_id) watched.add(w.show_id)
    })
  })
  return watched
}

/** Mark/unmark a movie as watched by the current user in the group */
export async function setGroupMovieWatched(groupId: string, showId: number, uid: string, watched: boolean): Promise<void> {
  await toggleWatchedEpisode(uid, showId, showId, watched, true)
  if (watched) {
    await createGroupWatchEvent(groupId, showId, showId, uid)
  }
}

export function listenToGroupWatchEvents(groupId: string, callback: (event: GroupWatchEventDoc) => void): () => void {  const q = query(
    collection(db, 'group_watch_events'),
    where('group_id', '==', groupId),
  )
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        callback(change.doc.data() as GroupWatchEventDoc)
      }
    })
  })
}

export async function getGroupInviteCode(groupId: string): Promise<string | null> {
  const gSnap = await getDoc(doc(db, 'groups', groupId))
  if (!gSnap.exists()) return null
  return (gSnap.data() as GroupDoc).invite_code
}

export async function getGroup(groupId: string): Promise<(GroupDoc & { id: string }) | null> {
  const gSnap = await getDoc(doc(db, 'groups', groupId))
  if (!gSnap.exists()) return null
  return { id: gSnap.id, ...(gSnap.data() as GroupDoc) }
}

export async function isUserInGroup(groupId: string, uid: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'group_members'), where('group_id', '==', groupId), where('user_id', '==', uid), limit(1)))
  return !snap.empty
}
