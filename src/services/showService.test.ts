import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildShow, buildEpisode, buildFollowedShow, buildWatchedEpisode, mockQuerySnapshot } from '../test/factories'

import { firestoreMock } from '../test/firestore-mock'
import { memoClear } from '../lib/hook-cache'

vi.mock('firebase/firestore', () => firestoreMock())
vi.mock('../lib/firebase', () => ({ getDb: vi.fn().mockResolvedValue('mock-db') }))

const firestore = vi.mocked(await import('firebase/firestore'))
const { getFollowedActiveShows, getBingingShows, getFinishedContent, getShowById, getEpisodesByShow, getRatingForShow, getShowByTmdbId, createShowFromTmdb, getWatchedEpisodesForShow, toggleWatchedEpisode, addFollowedShow, getResumePositions, setResumePosition } = await import('./showService')

describe('showService', () => {
  beforeEach(() => {
    // Clear call history but preserve mock implementations and return value queues
    firestore.getDocs.mockClear()
    firestore.addDoc.mockClear()
    firestore.setDoc.mockClear()
    firestore.deleteDoc.mockClear()
    firestore.updateDoc.mockClear()
    firestore.where.mockClear()
    firestore.orderBy.mockClear()
    firestore.limit.mockClear()
    firestore.collection.mockClear()
    firestore.query.mockClear()
    firestore.doc.mockClear()
    // Clear the memoize TTL cache so buildShowsMap doesn't return stale mock data
    memoClear()
  })

  describe('getFollowedActiveShows', () => {
    it('returns followed shows with metadata', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildFollowedShow()]))
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

      const result = await getFollowedActiveShows('user-1')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Breaking Bad')
      expect(result[0].imdb_rating).toBe(9.5)
    })

    it('returns empty array when no followed shows', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

      const result = await getFollowedActiveShows('user-1')
      expect(result).toEqual([])
    })

    it('filters by active=1', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildFollowedShow()]))
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

      await getFollowedActiveShows('user-1')
      expect(firestore.where).toHaveBeenCalledWith('active', '==', 1)
    })

    it('filters by user_id', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      await getFollowedActiveShows('user-1')
      expect(firestore.where).toHaveBeenCalledWith('user_id', '==', 'user-1')
    })
  })

  describe('getBingingShows', () => {
    it('returns shows in watchlist with some episodes watched but not all', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([{ show_id: 1 }])) // watchlist
        .mockResolvedValueOnce(mockQuerySnapshot([buildWatchedEpisode({ episode_id: 101, show_id: 1 })])) // watched: 1 ep
        .mockResolvedValueOnce(mockQuerySnapshot([])) // resume positions: none
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildEpisode({ tmdb_id: 101, show_id: 1 }),
          buildEpisode({ tmdb_id: 102, show_id: 1 }),
          buildEpisode({ tmdb_id: 103, show_id: 1 }),
        ])) // total: 3 episodes
        .mockResolvedValueOnce(mockQuerySnapshot([buildShow({ tmdb_id: 1 })])) // shows map

      const result = await getBingingShows('user-1')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Breaking Bad')
      expect(result[0].progress).toBe(33)
      expect(result[0].episodesWatched).toBe(1)
      expect(result[0].totalEpisodes).toBe(3)
    })

    it('returns empty array when no watchlist items', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([])) // watchlist empty
        .mockResolvedValueOnce(mockQuerySnapshot([]))
        .mockResolvedValueOnce(mockQuerySnapshot([]))
        .mockResolvedValueOnce(mockQuerySnapshot([]))
        .mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getBingingShows('user-1')
      expect(result).toEqual([])
    })

    it('returns movie in binging when it has a resume position but not watched', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([{ show_id: 123 }])) // watchlist: movie
        .mockResolvedValueOnce(mockQuerySnapshot([])) // watched: none
        .mockResolvedValueOnce(mockQuerySnapshot([{ show_id: 123, content_id: 123, content_type: 'movie', position_seconds: 1200, updated_at: '' }])) // resume position
        .mockResolvedValueOnce(mockQuerySnapshot([])) // episodes: none
        .mockResolvedValueOnce(mockQuerySnapshot([buildShow({ tmdb_id: 123, name: 'Test Movie', media_type: 'movie' })])) // shows map

      const result = await getBingingShows('user-1')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Movie')
    })

    it('excludes fully watched shows', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([{ show_id: 1 }])) // watchlist
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildWatchedEpisode({ episode_id: 101, show_id: 1 }),
          buildWatchedEpisode({ episode_id: 102, show_id: 1 }),
          buildWatchedEpisode({ episode_id: 103, show_id: 1 }),
        ])) // all 3 episodes watched
        .mockResolvedValueOnce(mockQuerySnapshot([])) // resume positions
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildEpisode({ tmdb_id: 101, show_id: 1 }),
          buildEpisode({ tmdb_id: 102, show_id: 1 }),
          buildEpisode({ tmdb_id: 103, show_id: 1 }),
        ])) // total: 3 episodes
        .mockResolvedValueOnce(mockQuerySnapshot([buildShow({ tmdb_id: 1 })])) // shows map

      const result = await getBingingShows('user-1')
      expect(result).toEqual([])
    })

    it('includes fully watched show when last episode has a resume position', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([{ show_id: 1 }])) // watchlist
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildWatchedEpisode({ episode_id: 101, show_id: 1 }),
          buildWatchedEpisode({ episode_id: 102, show_id: 1 }),
          buildWatchedEpisode({ episode_id: 103, show_id: 1 }),
        ])) // all 3 episodes watched
        .mockResolvedValueOnce(mockQuerySnapshot([
          { user_id: 'user-1', content_id: 103, content_type: 'episode', show_id: 1, position_seconds: 120, updated_at: '2024-01-15T20:00:00Z' },
        ])) // last episode (103) paused mid-way
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildEpisode({ tmdb_id: 101, show_id: 1, season_number: 1, episode_number: 1 }),
          buildEpisode({ tmdb_id: 102, show_id: 1, season_number: 1, episode_number: 2 }),
          buildEpisode({ tmdb_id: 103, show_id: 1, season_number: 1, episode_number: 3 }),
        ])) // total: 3 episodes, last = 103
        .mockResolvedValueOnce(mockQuerySnapshot([buildShow({ tmdb_id: 1 })])) // shows map

      const result = await getBingingShows('user-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
      expect(result[0].progress).toBe(100)
      expect(result[0].episodesWatched).toBe(3)
    })
  })

  describe('getFinishedContent', () => {
    it('excludes fully watched series whose last episode has a resume position', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildWatchedEpisode({ episode_id: 101, show_id: 1 }),
          buildWatchedEpisode({ episode_id: 102, show_id: 1 }),
          buildWatchedEpisode({ episode_id: 103, show_id: 1 }),
        ])) // all 3 episodes watched
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildEpisode({ tmdb_id: 101, show_id: 1, season_number: 1, episode_number: 1 }),
          buildEpisode({ tmdb_id: 102, show_id: 1, season_number: 1, episode_number: 2 }),
          buildEpisode({ tmdb_id: 103, show_id: 1, season_number: 1, episode_number: 3 }),
        ])) // total: 3 episodes, last = 103
        .mockResolvedValueOnce(mockQuerySnapshot([
          { user_id: 'user-1', content_id: 103, content_type: 'episode', show_id: 1, position_seconds: 90, updated_at: '2024-01-15T20:00:00Z' },
        ])) // last episode paused mid-way
        .mockResolvedValueOnce(mockQuerySnapshot([buildShow({ tmdb_id: 1 })])) // shows map

      const result = await getFinishedContent('user-1')
      expect(result).toEqual([])
    })

    it('includes fully watched series when last episode has no resume position', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildWatchedEpisode({ episode_id: 101, show_id: 1 }),
          buildWatchedEpisode({ episode_id: 102, show_id: 1 }),
          buildWatchedEpisode({ episode_id: 103, show_id: 1 }),
        ])) // all 3 episodes watched
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildEpisode({ tmdb_id: 101, show_id: 1, season_number: 1, episode_number: 1 }),
          buildEpisode({ tmdb_id: 102, show_id: 1, season_number: 1, episode_number: 2 }),
          buildEpisode({ tmdb_id: 103, show_id: 1, season_number: 1, episode_number: 3 }),
        ])) // total: 3 episodes, last = 103
        .mockResolvedValueOnce(mockQuerySnapshot([])) // no resume positions
        .mockResolvedValueOnce(mockQuerySnapshot([buildShow({ tmdb_id: 1 })])) // shows map

      const result = await getFinishedContent('user-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })
  })

  describe('getShowById', () => {
    it('returns show when found', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

      const result = await getShowById(1)
      expect(result).toBeTruthy()
      expect(result!.name).toBe('Breaking Bad')
    })

    it('returns null when not found', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getShowById(999)
      expect(result).toBeNull()
    })
  })

  describe('getEpisodesByShow', () => {
    it('returns episodes ordered by season then episode', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
        buildEpisode({ season_number: 1, episode_number: 2 }),
        buildEpisode({ season_number: 1, episode_number: 1 }),
      ]))

      const result = await getEpisodesByShow(1)
      expect(result).toHaveLength(2)
    })

    it('returns empty array for show with no episodes', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getEpisodesByShow(999)
      expect(result).toEqual([])
    })
  })

  describe('getRatingForShow', () => {
    it('returns rating when found', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([{ user_id: 'user-1', show_id: 1, rating: 8 }]))

      const result = await getRatingForShow('user-1', 1)
      expect(result).toBeTruthy()
      expect(result!.rating).toBe(8)
    })

    it('returns null when no rating', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getRatingForShow('user-1', 999)
      expect(result).toBeNull()
    })
  })

  describe('getShowByTmdbId', () => {
    it('returns show with id when found', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow()]))

      const result = await getShowByTmdbId(1396)
      expect(result).toBeTruthy()
      expect(result!.data.name).toBe('Breaking Bad')
    })

    it('returns null when not found', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getShowByTmdbId(999)
      expect(result).toBeNull()
    })
  })

  describe('createShowFromTmdb', () => {
    it('creates a show with tmdb_id as the identifier', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const id = await createShowFromTmdb(123, 'Test Movie', '/poster.jpg', '/backdrop.jpg', 'A test movie.')
      expect(id).toBe(123)
      expect(firestore.setDoc).toHaveBeenCalledOnce()
    })

    it('returns existing id if show already exists', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildShow({ tmdb_id: 1396 })]))

      const id = await createShowFromTmdb(1396, 'Breaking Bad', null, null, null)
      expect(id).toBe(1396)
      expect(firestore.setDoc).not.toHaveBeenCalled()
    })
  })

  describe('getWatchedEpisodesForShow', () => {
    it('returns map of episode ID to count', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
        buildWatchedEpisode({ episode_id: 101 }),
        buildWatchedEpisode({ episode_id: 102 }),
        buildWatchedEpisode({ episode_id: 101 }), // rewatch
      ]))

      const result = await getWatchedEpisodesForShow('user-1', 1)
      expect(result).toEqual(new Map([[101, 2], [102, 1]]))
    })

    it('returns empty map when none watched', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getWatchedEpisodesForShow('user-1', 1)
      expect(result).toEqual(new Map())
    })
  })

  describe('toggleWatchedEpisode', () => {
    it('adds watched episode when marking as watched', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([]))
        .mockResolvedValueOnce(mockQuerySnapshot([]))

      await toggleWatchedEpisode('user-1', 101, 1, true)
      expect(firestore.addDoc).toHaveBeenCalledOnce()
    })

    it('adds another doc even if already watched (rewatch)', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([buildWatchedEpisode()]))
        .mockResolvedValueOnce(mockQuerySnapshot([]))

      await toggleWatchedEpisode('user-1', 101, 1, true)
      expect(firestore.addDoc).toHaveBeenCalledOnce()
    })

    it('deletes all watched docs when marking as unwatched', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([
          buildWatchedEpisode({ episode_id: 101 }),
          buildWatchedEpisode({ episode_id: 101 }), // rewatched
        ]))
        .mockResolvedValueOnce(mockQuerySnapshot([]))

      await toggleWatchedEpisode('user-1', 101, 1, false)
      expect(firestore.deleteDoc).toHaveBeenCalledTimes(2)
    })

    it('does nothing if unwatching an un-watched episode', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce(mockQuerySnapshot([]))

      await toggleWatchedEpisode('user-1', 101, 1, false)
      expect(firestore.deleteDoc).not.toHaveBeenCalled()
    })
  })

  describe('addFollowedShow', () => {
    it('adds a new followed show', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await addFollowedShow('user-1', 1)
      expect(result).toBe(true)
      expect(firestore.addDoc).toHaveBeenCalledOnce()
    })

    it('returns false if already followed', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildFollowedShow()]))

      const result = await addFollowedShow('user-1', 1)
      expect(result).toBe(false)
      expect(firestore.addDoc).not.toHaveBeenCalled()
    })
  })

  describe('getResumePositions', () => {
    it('returns a map of content_id to position_seconds', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
        { user_id: 'user-1', content_id: 101, content_type: 'episode', show_id: 1, position_seconds: 120, updated_at: '2024-01-15T20:00:00Z' },
        { user_id: 'user-1', content_id: 102, content_type: 'episode', show_id: 1, position_seconds: 45, updated_at: '2024-01-15T20:00:00Z' },
      ]))

      const result = await getResumePositions('user-1', 1)
      expect(result.get(101)).toBe(120)
      expect(result.get(102)).toBe(45)
    })

    it('returns empty map when no resume positions', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getResumePositions('user-1', 1)
      expect(result.size).toBe(0)
    })

    it('filters by user_id and show_id', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      await getResumePositions('user-1', 42)
      expect(firestore.where).toHaveBeenCalledWith('user_id', '==', 'user-1')
      expect(firestore.where).toHaveBeenCalledWith('show_id', '==', 42)
    })
  })

  describe('setResumePosition', () => {
    it('adds new position when none exists', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      await setResumePosition('user-1', 101, 1, 'episode', 90)
      expect(firestore.addDoc).toHaveBeenCalledOnce()
      expect(firestore.setDoc).not.toHaveBeenCalled()
    })

    it('overwrites existing position with setDoc', async () => {
      const existing = { user_id: 'user-1', content_id: 101, content_type: 'episode', show_id: 1, position_seconds: 60, updated_at: '2024-01-01T00:00:00Z' }
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([existing]))

      await setResumePosition('user-1', 101, 1, 'episode', 120)
      expect(firestore.setDoc).toHaveBeenCalledOnce()
      expect(firestore.addDoc).not.toHaveBeenCalled()
    })

    it('deletes position when seconds is null and doc exists', async () => {
      const existing = { user_id: 'user-1', content_id: 101, content_type: 'episode', show_id: 1, position_seconds: 60, updated_at: '2024-01-01T00:00:00Z' }
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([existing]))

      await setResumePosition('user-1', 101, 1, 'episode', null)
      expect(firestore.deleteDoc).toHaveBeenCalledOnce()
    })

    it('does nothing when seconds is null and no doc exists', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      await setResumePosition('user-1', 101, 1, 'episode', null)
      expect(firestore.deleteDoc).not.toHaveBeenCalled()
      expect(firestore.addDoc).not.toHaveBeenCalled()
    })

    it('works for movie content type', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      await setResumePosition('user-1', -123, -123, 'movie', 45)
      expect(firestore.addDoc).toHaveBeenCalledOnce()
      expect(firestore.where).toHaveBeenCalledWith('content_type', '==', 'movie')
    })
  })
})
