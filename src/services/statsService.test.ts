import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildUserStats, buildRating, buildBadge, buildFollowedShow, mockQuerySnapshot } from '../test/factories'

import { firestoreMock } from '../test/firestore-mock'

vi.mock('firebase/firestore', () => firestoreMock())
vi.mock('../lib/firebase', () => ({ getDb: vi.fn().mockResolvedValue('mock-db') }))

const firestore = await import('firebase/firestore')
const { getUserStats, getRatingDistribution, getShowCount, getBadges, BADGE_NAMES } = await import('./statsService')

describe('statsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('BADGE_NAMES', () => {
    it('defines 10 badges', () => {
      expect(Object.keys(BADGE_NAMES)).toHaveLength(10)
    })

    it('has descriptive names', () => {
      expect(BADGE_NAMES[1]).toBe('FIRST EPISODE')
      expect(BADGE_NAMES[10]).toBe('TOP FAN')
    })
  })

  describe('getUserStats', () => {
    it('returns user stats when found', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([buildUserStats()]))

      const result = await getUserStats('user-1')
      expect(result.nb_episodes_watched).toBe(150)
      expect(result.time_spent).toBe(3600)
    })

    it('returns empty object when no stats found', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getUserStats('user-1')
      expect(result).toEqual({})
    })

    it('filters by user_id', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      await getUserStats('user-1')
      expect(firestore.where).toHaveBeenCalledWith('user_id', '==', 'user-1')
    })
  })

  describe('getRatingDistribution', () => {
    it('returns empty array when no ratings', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getRatingDistribution('user-1')
      expect(result).toEqual([])
    })

    it('aggregates ratings by floor value', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
        buildRating({ rating: 8 }),
        buildRating({ rating: 8.5 }),
        buildRating({ rating: 7 }),
      ]))

      const result = await getRatingDistribution('user-1')
      expect(result).toEqual([
        { rating: 7, count: 1 },
        { rating: 8, count: 2 },
      ])
    })

    it('returns results sorted by rating ascending', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
        buildRating({ rating: 9 }),
        buildRating({ rating: 5 }),
        buildRating({ rating: 7 }),
      ]))

      const result = await getRatingDistribution('user-1')
      expect(result.map(r => r.rating)).toEqual([5, 7, 9])
    })

    it('filters by user_id', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      await getRatingDistribution('user-42')
      expect(firestore.where).toHaveBeenCalledWith('user_id', '==', 'user-42')
    })

    it('handles a single rating', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
        buildRating({ rating: 10 }),
      ]))

      const result = await getRatingDistribution('user-1')
      expect(result).toEqual([{ rating: 10, count: 1 }])
    })

    it('uses Math.floor for fractional ratings', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
        buildRating({ rating: 7.9 }),
        buildRating({ rating: 7.1 }),
      ]))

      const result = await getRatingDistribution('user-1')
      expect(result).toEqual([{ rating: 7, count: 2 }])
    })
  })

  describe('getShowCount', () => {
    it('returns number of followed shows for a user', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
        buildFollowedShow(),
        buildFollowedShow({ show_id: 2 }),
      ]))

      const result = await getShowCount('user-1')
      expect(result).toBe(2)
    })

    it('returns 0 when user follows no shows', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getShowCount('user-1')
      expect(result).toBe(0)
    })

    it('filters by user_id', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      await getShowCount('user-42')
      expect(firestore.where).toHaveBeenCalledWith('user_id', '==', 'user-42')
    })
  })

  describe('getBadges', () => {
    it('returns badges ordered by badge_id', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([
        buildBadge({ badge_id: '2' }),
        buildBadge({ badge_id: '1' }),
      ]))

      const result = await getBadges('user-1')
      expect(result).toHaveLength(2)
    })

    it('returns empty array when no badges', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      const result = await getBadges('user-1')
      expect(result).toEqual([])
    })

    it('filters by user_id', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce(mockQuerySnapshot([]))

      await getBadges('user-1')
      expect(firestore.where).toHaveBeenCalledWith('user_id', '==', 'user-1')
    })
  })
})
