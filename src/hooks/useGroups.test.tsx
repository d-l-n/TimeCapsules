import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useGroups } from './useGroups'

vi.mock('../services/groupService', () => ({
  getUserGroups: vi.fn(),
  getGroupMembers: vi.fn(),
  getGroupShows: vi.fn(),
  getGroupEpisodeProgress: vi.fn(),
}))

import { getUserGroups } from '../services/groupService'
const mockedGetUserGroups = vi.mocked(getUserGroups)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useGroups', () => {
  it('returns empty groups when uid is undefined', async () => {
    const { result } = renderHook(() => useGroups(undefined))
    expect(result.current.groups).toEqual([])
    expect(mockedGetUserGroups).not.toHaveBeenCalled()
  })

  it('fetches groups on mount', async () => {
    const mockGroups = [{ id: 'g1', name: 'Test Group', invite_code: 'ABC', member_count: 3 }]
    mockedGetUserGroups.mockResolvedValue(mockGroups as any)

    const { result } = renderHook(() => useGroups('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.groups).toEqual(mockGroups)
    expect(mockedGetUserGroups).toHaveBeenCalledWith('user1')
  })

  it('refresh refetches groups', async () => {
    const mockGroups = [{ id: 'g1', name: 'Test Group', invite_code: 'ABC', member_count: 3 }]
    mockedGetUserGroups.mockResolvedValue(mockGroups as any)

    const { result } = renderHook(() => useGroups('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const newGroups = [{ id: 'g2', name: 'New Group', invite_code: 'XYZ', member_count: 1 }]
    mockedGetUserGroups.mockResolvedValue(newGroups as any)

    await act(async () => { await result.current.refresh() })
    expect(result.current.groups).toEqual(newGroups)
  })
})
