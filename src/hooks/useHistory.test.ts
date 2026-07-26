import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useHistory } from './useHistory'
import { clearCache } from '../lib/hook-cache'

const mockEntries = [
  { id: 1, watched_at: '2024-01-15T20:00:00Z', episode_number: 1, season_number: 1, show_name: 'Breaking Bad', show_id: 1 },
]

vi.mock('../services/historyService', () => ({
  getWatchHistory: vi.fn(),
}))

const historyService = await import('../services/historyService')

describe('useHistory', () => {
  beforeEach(() => {
    clearCache()
    vi.clearAllMocks()
    vi.mocked(historyService.getWatchHistory).mockResolvedValue({ entries: [], months: [] })
  })

  it('returns loading initially', () => {
    const { result } = renderHook(() => useHistory('user-1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.entries).toEqual([])
    expect(result.current.months).toEqual([])
  })

  it('returns loading when uid is undefined', () => {
    const { result } = renderHook(() => useHistory(undefined))
    expect(result.current.loading).toBe(true)
  })

  it('fetches and sets entries and months', async () => {
    vi.mocked(historyService.getWatchHistory).mockResolvedValue({ entries: mockEntries, months: ['2024-01'] })

    const { result } = renderHook(() => useHistory('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries).toEqual(mockEntries)
    expect(result.current.months).toEqual(['2024-01'])
    expect(historyService.getWatchHistory).toHaveBeenCalledWith('user-1')
  })

  it('handles empty history', async () => {
    vi.mocked(historyService.getWatchHistory).mockResolvedValue({ entries: [], months: [] })

    const { result } = renderHook(() => useHistory('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries).toEqual([])
    expect(result.current.months).toEqual([])
  })

  it('refetches when uid changes', async () => {
    vi.mocked(historyService.getWatchHistory).mockResolvedValue({ entries: mockEntries, months: ['2024-01'] })

    const { rerender } = renderHook(
      (uid: string | undefined) => useHistory(uid),
      { initialProps: 'user-1' as string | undefined },
    )
    await waitFor(() => expect(historyService.getWatchHistory).toHaveBeenCalledWith('user-1'))

    rerender('user-2')
    await waitFor(() => expect(historyService.getWatchHistory).toHaveBeenCalledWith('user-2'))
    expect(historyService.getWatchHistory).toHaveBeenCalledTimes(2)
  })

  it('does not fetch when uid changes to undefined', async () => {
    const { rerender } = renderHook(
      (uid: string | undefined) => useHistory(uid),
      { initialProps: 'user-1' as string | undefined },
    )
    await waitFor(() => expect(historyService.getWatchHistory).toHaveBeenCalledTimes(1))
    rerender(undefined)
    expect(historyService.getWatchHistory).toHaveBeenCalledTimes(1)
  })
})
