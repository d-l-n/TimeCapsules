import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStats } from './useStats'
import { clearCache } from '../lib/hook-cache'

const mockStats = { time_spent: 3600, nb_episodes_watched: 150, nb_shows_followed: 10, score: 85, user_id: 'user-1' }
const mockDist = [{ rating: 8, count: 5 }]
const mockBadges = [{ user_id: 'user-1', badge_id: '1', earned_at: '2024-01-15T20:00:00Z' }]

vi.mock('../services/statsService', () => ({
  getUserStats: vi.fn(),
  getRatingDistribution: vi.fn(),
  getShowCount: vi.fn(),
  getBadges: vi.fn(),
  getStreak: vi.fn(),
  BADGE_NAMES: { 1: 'FIRST EPISODE' },
}))

const statsService = await import('../services/statsService')

describe('useStats', () => {
  beforeEach(() => {
    clearCache()
    vi.clearAllMocks()
    vi.mocked(statsService.getUserStats).mockResolvedValue({} as any)
    vi.mocked(statsService.getRatingDistribution).mockResolvedValue([])
    vi.mocked(statsService.getShowCount).mockResolvedValue(0)
    vi.mocked(statsService.getBadges).mockResolvedValue([])
    vi.mocked(statsService.getStreak).mockResolvedValue(0)
  })

  it('returns loading initially', () => {
    const { result } = renderHook(() => useStats('user-1'))
    expect(result.current.loading).toBe(true)
  })

  it('returns loading when uid is undefined', () => {
    const { result } = renderHook(() => useStats(undefined))
    expect(result.current.loading).toBe(true)
  })

  it('fetches and sets all stats', async () => {
    vi.mocked(statsService.getUserStats).mockResolvedValue(mockStats)
    vi.mocked(statsService.getRatingDistribution).mockResolvedValue(mockDist)
    vi.mocked(statsService.getShowCount).mockResolvedValue(42)
    vi.mocked(statsService.getBadges).mockResolvedValue(mockBadges)

    const { result } = renderHook(() => useStats('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stats).toEqual(mockStats)
    expect(result.current.ratingDist).toEqual(mockDist)
    expect(result.current.showCount).toBe(42)
    expect(result.current.badges).toEqual(mockBadges)
    expect(statsService.getUserStats).toHaveBeenCalledWith('user-1')
    expect(statsService.getShowCount).toHaveBeenCalledWith('user-1')
  })

  it('handles empty stats', async () => {
    vi.mocked(statsService.getUserStats).mockResolvedValue({} as any)
    vi.mocked(statsService.getRatingDistribution).mockResolvedValue([])
    vi.mocked(statsService.getShowCount).mockResolvedValue(0)
    vi.mocked(statsService.getBadges).mockResolvedValue([])

    const { result } = renderHook(() => useStats('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stats).toEqual({})
    expect(result.current.ratingDist).toEqual([])
    expect(result.current.showCount).toBe(0)
    expect(result.current.badges).toEqual([])
  })

  it('refetches when uid changes', async () => {
    vi.mocked(statsService.getUserStats).mockResolvedValue(mockStats)
    vi.mocked(statsService.getRatingDistribution).mockResolvedValue(mockDist)
    vi.mocked(statsService.getShowCount).mockResolvedValue(0)
    vi.mocked(statsService.getBadges).mockResolvedValue(mockBadges)

    const { rerender } = renderHook(
      (uid: string | undefined) => useStats(uid),
      { initialProps: 'user-1' as string | undefined },
    )
    await waitFor(() => expect(statsService.getUserStats).toHaveBeenCalledWith('user-1'))

    rerender('user-2')
    await waitFor(() => expect(statsService.getUserStats).toHaveBeenCalledWith('user-2'))
  })
})
