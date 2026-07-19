import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildWatchedEpisode, buildEpisode, buildShow, mockQuerySnapshot } from '../test/factories'

import { firestoreMock } from '../test/firestore-mock'
import { mementoClear } from '../lib/memento'

vi.mock('firebase/firestore', () => firestoreMock())
vi.mock('../lib/firebase', () => ({ db: 'mock-db' }))

const firestore = await import('firebase/firestore')
const { getWatchHistory } = await import('./historyService')

describe('historyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear the memento TTL cache so buildShowsMap doesn't return stale mock data
    mementoClear()
  })

  it('returns empty entries and months when no watched episodes', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

    const result = await getWatchHistory('user-1')
    expect(result.entries).toEqual([])
    expect(result.months).toEqual([])
  })

  it('returns entries with show and episode metadata', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildWatchedEpisode()]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
      buildEpisode({ tmdb_id: 101, show_id: 1, season_number: 1, episode_number: 1 }),
    ]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

    const result = await getWatchHistory('user-1')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].show_name).toBe('Breaking Bad')
    expect(result.entries[0].episode_number).toBe(1)
    expect(result.entries[0].season_number).toBe(1)
    expect(result.entries[0].show_id).toBe(1)
  })

  it('skips episodes without matching episode doc', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildWatchedEpisode()]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

    const result = await getWatchHistory('user-1')
    expect(result.entries).toEqual([])
  })

  it('uses Unknown for shows without matching show doc', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildWatchedEpisode()]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
      buildEpisode({ tmdb_id: 101, show_id: 999 }),
    ]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

    const result = await getWatchHistory('user-1')
    expect(result.entries[0].show_name).toBe('Unknown')
  })

  it('generates months from watched_at dates', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
      buildWatchedEpisode({ watched_at: '2024-01-15T20:00:00Z' }),
      buildWatchedEpisode({ watched_at: '2024-02-10T20:00:00Z' }),
      buildWatchedEpisode({ watched_at: '2024-01-20T20:00:00Z' }),
    ]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
      buildEpisode({ tmdb_id: 101 }),
      buildEpisode({ tmdb_id: 102 }),
      buildEpisode({ tmdb_id: 103 }),
    ]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

    const result = await getWatchHistory('user-1')
    expect(result.months).toEqual(['2024-02', '2024-01'])
  })

  it('filters by user_id', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

    await getWatchHistory('user-42')
    expect(firestore.where).toHaveBeenCalledWith('user_id', '==', 'user-42')
  })

  it('limits to 200 entries', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

    await getWatchHistory('user-1')
    expect(firestore.limit).toHaveBeenCalledWith(200)
  })

  it('deduplicates months when multiple episodes share the same month', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
      buildWatchedEpisode({ episode_id: 101, watched_at: '2024-03-10T12:00:00Z' }),
      buildWatchedEpisode({ episode_id: 102, watched_at: '2024-03-15T12:00:00Z' }),
      buildWatchedEpisode({ episode_id: 103, watched_at: '2024-03-20T12:00:00Z' }),
    ]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
      buildEpisode({ tmdb_id: 101 }),
      buildEpisode({ tmdb_id: 102 }),
      buildEpisode({ tmdb_id: 103 }),
    ]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

    const result = await getWatchHistory('user-1')
    expect(result.months).toEqual(['2024-03'])
    expect(result.months).toHaveLength(1)
  })

  it('orders months descending (most recent first)', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
      buildWatchedEpisode({ episode_id: 101, watched_at: '2023-06-10T12:00:00Z' }),
      buildWatchedEpisode({ episode_id: 102, watched_at: '2024-01-20T12:00:00Z' }),
    ]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
      buildEpisode({ tmdb_id: 101 }),
      buildEpisode({ tmdb_id: 102 }),
    ]))
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

    const result = await getWatchHistory('user-1')
    expect(result.months[0]).toBe('2024-01')
    expect(result.months[1]).toBe('2023-06')
  })
})
