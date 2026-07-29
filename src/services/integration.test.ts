import { describe, it, expect, vi, beforeEach } from 'vitest'
import { firestoreMock } from '../test/firestore-mock'
import { mockQuerySnapshot, buildShow, buildEpisode, buildFollowedShow, buildWatchedEpisode } from '../test/factories'
import { memoClear } from '../lib/hook-cache'

vi.mock('firebase/firestore', () => firestoreMock())
vi.mock('../lib/firebase', () => ({ getDb: vi.fn().mockResolvedValue('mock-db') }))

const firestore = vi.mocked(await import('firebase/firestore')) as any
const showService = await import('./showService')
const statsService = await import('./statsService')

type Queue = { collection: string; data: unknown[] }[]
let currentQueue: Queue = []
function setupQueue(queue: Queue) {
  currentQueue = queue
  firestore.collection.mockImplementation((_db: unknown, name: string) => name)
  firestore.query.mockImplementation((...args: unknown[]) => args[0])
  firestore.getDocs.mockImplementation(async (q: any) => {
    const col = String(q ?? 'unknown')
    const entry = currentQueue.find(e => col.includes(e.collection))
    return mockQuerySnapshot(entry ? entry.data : [])
  })
}

describe('integration: follow -> watch -> stats', () => {
  beforeEach(() => {
    ;['getDocs', 'addDoc', 'setDoc', 'deleteDoc', 'updateDoc', 'where', 'orderBy', 'limit', 'collection', 'query', 'doc'].forEach(m => firestore[m as keyof typeof firestore].mockClear())
    memoClear()
  })

  it('followed show appears in dashboard query and watching an episode raises stats', async () => {
    const uid = 'user-1'

    setupQueue([
      { collection: 'followed_shows', data: [buildFollowedShow({ user_id: uid, show_id: 1 })] },
      { collection: 'shows', data: [buildShow({ tmdb_id: 1 })] },
    ])
    const followed = await showService.getFollowedActiveShows(uid)
    expect(followed).toHaveLength(1)
    expect(followed[0].name).toBe('Breaking Bad')

    setupQueue([{ collection: 'watched_episodes', data: [buildWatchedEpisode({ user_id: uid, episode_id: 101, show_id: 1 })] }])
    const watched = await showService.getWatchedEpisodesForShow(uid, 1)
    expect(watched.get(101)).toBe(1)

    const todayIso = new Date().toISOString()
    setupQueue([{ collection: 'watched_episodes', data: [buildWatchedEpisode({ user_id: uid, episode_id: 101, show_id: 1, watched_at: todayIso })] }])
    const streak = await statsService.getStreak(uid)
    expect(streak).toBeGreaterThanOrEqual(1)
  })

  it('marking an episode adds a watched doc and shows in binging progress', async () => {
    const uid = 'user-2'

    setupQueue([
      { collection: 'watched_episodes', data: [] },
      { collection: 'watched_episodes', data: [] },
    ])
    await showService.toggleWatchedEpisode(uid, 101, 1, true)
    expect(firestore.addDoc).toHaveBeenCalledTimes(1)

    setupQueue([
      { collection: 'watchlist', data: [{ show_id: 1 }] },
      { collection: 'watched_episodes', data: [buildWatchedEpisode({ episode_id: 101, show_id: 1 })] },
      { collection: 'resume_positions', data: [] },
      { collection: 'episodes', data: [
        buildEpisode({ tmdb_id: 101, show_id: 1 }),
        buildEpisode({ tmdb_id: 102, show_id: 1 }),
      ] },
      { collection: 'shows', data: [buildShow({ tmdb_id: 1 })] },
    ])
    const binging = await showService.getBingingShows(uid)
    expect(binging).toHaveLength(1)
    expect(binging[0].progress).toBe(50)
    expect(binging[0].episodesWatched).toBe(1)
    expect(binging[0].totalEpisodes).toBe(2)
  })
})

describe('integration: rating + emotion roundtrip', () => {
  beforeEach(() => {
    ;['getDocs', 'addDoc', 'setDoc', 'deleteDoc', 'updateDoc', 'where', 'orderBy', 'limit', 'collection', 'query', 'doc'].forEach(m => firestore[m as keyof typeof firestore].mockClear())
    memoClear()
  })

  it('rating is written and reflected in distribution', async () => {
    const uid = 'user-3'

    setupQueue([{ collection: 'ratings', data: [] }])
    const distBefore = await statsService.getRatingDistribution(uid)
    expect(distBefore).toEqual([])

    firestore.setDoc.mockResolvedValueOnce(undefined)
    const { setRating } = await import('./showService')
    await setRating(uid, 1, 9)

    setupQueue([{ collection: 'ratings', data: [{ user_id: uid, show_id: 1, rating: 9, rated_at: null }] }])
    const distAfter = await statsService.getRatingDistribution(uid)
    expect(distAfter).toEqual([{ rating: 9, count: 1 }])
  })

  it('emotion write persists and reads back for a show', async () => {
    const uid = 'user-4'
    const { setEmotion, getEmotionsForShow } = await import('./emotionService')

    setupQueue([{ collection: 'episode_emotions', data: [] }])
    await setEmotion(uid, 101, 'happy')
    expect(firestore.addDoc).toHaveBeenCalled()

    setupQueue([
      { collection: 'watched_episodes', data: [{ user_id: uid, episode_id: 101, show_id: 1 }] },
      { collection: 'episode_emotions', data: [{ user_id: uid, episode_id: 101, emotion_id: 'happy' }] },
    ])
    const emotions = await getEmotionsForShow(uid, 1)
    expect(emotions.get(101)).toBe('happy')
  })
})
