import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLists } from './useLists'
import { clearCache } from '../lib/hook-cache'

const mockLists = [
  { id: 'l1', user_id: 'user-1', name: 'Favorites', description: 'My top shows', show_ids: [1, 2, 3], createdAt: '2024-01-01T00:00:00Z' },
]

vi.mock('../services/listService', () => ({
  getUserLists: vi.fn(),
}))

const listService = await import('../services/listService')

describe('useLists', () => {
  beforeEach(() => {
    clearCache()
    vi.clearAllMocks()
    vi.mocked(listService.getUserLists).mockResolvedValue([])
  })

  it('returns loading initially', () => {
    const { result } = renderHook(() => useLists('user-1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.lists).toEqual([])
  })

  it('returns loading when uid is undefined', () => {
    const { result } = renderHook(() => useLists(undefined))
    expect(result.current.loading).toBe(false)
    expect(result.current.lists).toEqual([])
  })

  it('fetches and sets lists', async () => {
    vi.mocked(listService.getUserLists).mockResolvedValue(mockLists)

    const { result } = renderHook(() => useLists('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lists).toEqual(mockLists)
    expect(listService.getUserLists).toHaveBeenCalledWith('user-1')
  })

  it('handles empty lists', async () => {
    const { result } = renderHook(() => useLists('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lists).toEqual([])
  })

  it('refetches when uid changes', async () => {
    vi.mocked(listService.getUserLists).mockResolvedValue(mockLists)

    const { rerender } = renderHook(
      (uid: string | undefined) => useLists(uid),
      { initialProps: 'user-1' as string | undefined },
    )
    await waitFor(() => expect(listService.getUserLists).toHaveBeenCalledWith('user-1'))

    rerender('user-2')
    await waitFor(() => expect(listService.getUserLists).toHaveBeenCalledWith('user-2'))
    expect(listService.getUserLists).toHaveBeenCalledTimes(2)
  })

  it('does not fetch when uid changes to undefined', async () => {
    const { rerender } = renderHook(
      (uid: string | undefined) => useLists(uid),
      { initialProps: 'user-1' as string | undefined },
    )
    await waitFor(() => expect(listService.getUserLists).toHaveBeenCalledTimes(1))
    rerender(undefined)
    expect(listService.getUserLists).toHaveBeenCalledTimes(1)
  })

  it('provides a refresh function that re-fetches', async () => {
    vi.mocked(listService.getUserLists).mockResolvedValue(mockLists)

    const { result } = renderHook(() => useLists('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const newLists = [
      { id: 'l2', user_id: 'user-1', name: 'Watch Later', description: '', show_ids: [], createdAt: '2024-02-01T00:00:00Z' },
    ]
    vi.mocked(listService.getUserLists).mockResolvedValue(newLists)
    await result.current.refresh()
    await waitFor(() => expect(result.current.lists).toEqual(newLists))
  })
})
