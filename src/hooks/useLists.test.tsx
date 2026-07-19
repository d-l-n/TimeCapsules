import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLists } from './useLists'

vi.mock('../services/listService', () => ({
  getUserLists: vi.fn(),
}))

import { getUserLists } from '../services/listService'
const mockedGetUserLists = vi.mocked(getUserLists)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useLists', () => {
  it('returns empty when uid is undefined', async () => {
    const { result } = renderHook(() => useLists(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lists).toEqual([])
    expect(mockedGetUserLists).not.toHaveBeenCalled()
  })

  it('fetches lists on mount', async () => {
    const mockLists = [{ id: 'l1', name: 'Favorites', user_id: 'user1', show_ids: [] }]
    mockedGetUserLists.mockResolvedValue(mockLists as any)

    const { result } = renderHook(() => useLists('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lists).toEqual(mockLists)
    expect(mockedGetUserLists).toHaveBeenCalledWith('user1')
  })
})
