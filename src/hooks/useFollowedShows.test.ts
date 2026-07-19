import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFollowedShows } from './useFollowedShows'

const mockShows = [
  { id: 1, name: 'Breaking Bad', poster_url: null, imdb_rating: 9.5 },
]

const mockBinging = [
  { id: 1, name: 'Breaking Bad', poster_url: null, imdb_rating: 9.5, progress: 33, episodesWatched: 3, totalEpisodes: 9 },
]

vi.mock('../services/showService', () => ({
  getFollowedActiveShows: vi.fn(),
  getBingingShows: vi.fn(),
}))

const showService = await import('../services/showService')

describe('useFollowedShows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(showService.getFollowedActiveShows).mockResolvedValue([])
    vi.mocked(showService.getBingingShows).mockResolvedValue([])
  })

  it('returns loading initially', () => {
    const { result } = renderHook(() => useFollowedShows('user-1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.shows).toEqual([])
    expect(result.current.binging).toEqual([])
  })

  it('returns loading when uid is undefined', () => {
    const { result } = renderHook(() => useFollowedShows(undefined))
    expect(result.current.loading).toBe(true)
    expect(result.current.shows).toEqual([])
  })

  it('fetches and sets shows and binging', async () => {
    vi.mocked(showService.getFollowedActiveShows).mockResolvedValue(mockShows)
    vi.mocked(showService.getBingingShows).mockResolvedValue(mockBinging)

    const { result } = renderHook(() => useFollowedShows('user-1'))

    await waitFor(() => {
      expect(result.current.shows).toEqual(mockShows)
      expect(result.current.binging).toEqual(mockBinging)
    })
    expect(result.current.loading).toBe(false)
    expect(showService.getFollowedActiveShows).toHaveBeenCalledWith('user-1')
    expect(showService.getBingingShows).toHaveBeenCalledWith('user-1')
  })

  it('handles binging fetch error gracefully', async () => {
    vi.mocked(showService.getFollowedActiveShows).mockResolvedValue(mockShows)
    vi.mocked(showService.getBingingShows).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useFollowedShows('user-1'))

    await waitFor(() => {
      expect(result.current.shows).toEqual(mockShows)
      expect(result.current.binging).toEqual([])
    })
    expect(result.current.loading).toBe(false)
  })

  it('does not fetch when uid changes to undefined', async () => {
    const { rerender } = renderHook(
      (uid: string | undefined) => useFollowedShows(uid),
      { initialProps: 'user-1' as string | undefined },
    )
    await waitFor(() => expect(showService.getFollowedActiveShows).toHaveBeenCalledTimes(1))
    rerender(undefined)
    expect(showService.getFollowedActiveShows).toHaveBeenCalledTimes(1)
  })

  it('refetches when uid changes', async () => {
    vi.mocked(showService.getFollowedActiveShows).mockResolvedValue(mockShows)
    vi.mocked(showService.getBingingShows).mockResolvedValue(mockBinging)

    const { rerender } = renderHook(
      (uid: string | undefined) => useFollowedShows(uid),
      { initialProps: 'user-1' as string | undefined },
    )
    await waitFor(() => expect(showService.getFollowedActiveShows).toHaveBeenCalledWith('user-1'))

    rerender('user-2')
    await waitFor(() => expect(showService.getFollowedActiveShows).toHaveBeenCalledWith('user-2'))
    expect(showService.getFollowedActiveShows).toHaveBeenCalledTimes(2)
  })
})
