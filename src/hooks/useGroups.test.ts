import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGroups, useGroupMembers, useGroupShows, useGroupProgress } from './useGroups'

const mockGroups = [
  { id: 'g1', name: 'Marvel Fans', invite_code: 'ABC123', created_by: 'user-1', created_at: '2024-01-01T00:00:00Z', member_count: 3 },
]

const mockMembers = [
  { user_id: 'user-1', role: 'admin' as const, joined_at: '2024-01-01T00:00:00Z', display_name: 'Alice', photo_url: '' },
  { user_id: 'user-2', role: 'member' as const, joined_at: '2024-01-02T00:00:00Z', display_name: 'Bob', photo_url: '' },
]

const mockShows = [
  { tmdb_id: 1, name: 'Breaking Bad', show_id: 1, poster_url: null, backdrop_url: null, synopsis: null, imdb_rating: 9.5, imdb_votes: null, imdb_id: null },
]

const mockProgress = [
  { episode_id: 101, user_ids: ['user-1', 'user-2'] },
]

vi.mock('../services/groupService', () => ({
  getUserGroups: vi.fn(),
  getGroupMembers: vi.fn(),
  getGroupShows: vi.fn(),
  getGroupEpisodeProgress: vi.fn(),
}))

const groupService = await import('../services/groupService')

describe('useGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(groupService.getUserGroups).mockResolvedValue([])
  })

  it('returns loading initially', () => {
    const { result } = renderHook(() => useGroups('user-1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.groups).toEqual([])
  })

  it('returns loading when uid is undefined', () => {
    const { result } = renderHook(() => useGroups(undefined))
    expect(result.current.loading).toBe(true)
    expect(result.current.groups).toEqual([])
  })

  it('fetches and sets groups', async () => {
    vi.mocked(groupService.getUserGroups).mockResolvedValue(mockGroups)

    const { result } = renderHook(() => useGroups('user-1'))

    await waitFor(() => expect(result.current.groups).toEqual(mockGroups))
    expect(result.current.loading).toBe(false)
    expect(groupService.getUserGroups).toHaveBeenCalledWith('user-1')
  })

  it('handles empty groups', async () => {
    vi.mocked(groupService.getUserGroups).mockResolvedValue([])

    const { result } = renderHook(() => useGroups('user-1'))

    await waitFor(() => expect(result.current.groups).toEqual([]))
  })

  it('refetches when uid changes', async () => {
    vi.mocked(groupService.getUserGroups).mockResolvedValue(mockGroups)

    const { rerender } = renderHook(
      (uid: string | undefined) => useGroups(uid),
      { initialProps: 'user-1' as string | undefined },
    )
    await waitFor(() => expect(groupService.getUserGroups).toHaveBeenCalledWith('user-1'))

    vi.mocked(groupService.getUserGroups).mockResolvedValue([mockGroups[0]])
    rerender('user-2')
    await waitFor(() => expect(groupService.getUserGroups).toHaveBeenCalledWith('user-2'))
    expect(groupService.getUserGroups).toHaveBeenCalledTimes(2)
  })

  it('does not fetch when uid changes to undefined', async () => {
    const { rerender } = renderHook(
      (uid: string | undefined) => useGroups(uid),
      { initialProps: 'user-1' as string | undefined },
    )
    await waitFor(() => expect(groupService.getUserGroups).toHaveBeenCalledTimes(1))
    rerender(undefined)
    expect(groupService.getUserGroups).toHaveBeenCalledTimes(1)
  })

  it('provides a refresh function that re-fetches', async () => {
    vi.mocked(groupService.getUserGroups).mockResolvedValue(mockGroups)

    const { result } = renderHook(() => useGroups('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const newGroups = [
      { id: 'g2', name: 'New Group', invite_code: 'XYZ789', created_by: 'user-1', created_at: '2024-02-01T00:00:00Z', member_count: 2 },
    ]
    vi.mocked(groupService.getUserGroups).mockResolvedValue(newGroups)
    await result.current.refresh()
    await waitFor(() => expect(result.current.groups).toEqual(newGroups))
  })
})

describe('useGroupMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(groupService.getGroupMembers).mockResolvedValue([])
  })

  it('returns loading initially', () => {
    const { result } = renderHook(() => useGroupMembers('g1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.members).toEqual([])
  })

  it('returns loading when groupId is undefined', () => {
    const { result } = renderHook(() => useGroupMembers(undefined))
    expect(result.current.loading).toBe(true)
    expect(result.current.members).toEqual([])
  })

  it('fetches and sets members', async () => {
    vi.mocked(groupService.getGroupMembers).mockResolvedValue(mockMembers)

    const { result } = renderHook(() => useGroupMembers('g1'))

    await waitFor(() => expect(result.current.members).toEqual(mockMembers))
    expect(result.current.loading).toBe(false)
    expect(groupService.getGroupMembers).toHaveBeenCalledWith('g1')
  })

  it('handles empty members', async () => {
    const { result } = renderHook(() => useGroupMembers('g1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.members).toEqual([])
  })

  it('refetches when groupId changes', async () => {
    vi.mocked(groupService.getGroupMembers).mockResolvedValue(mockMembers)

    const { rerender } = renderHook(
      (gid: string | undefined) => useGroupMembers(gid),
      { initialProps: 'g1' as string | undefined },
    )
    await waitFor(() => expect(groupService.getGroupMembers).toHaveBeenCalledWith('g1'))

    rerender('g2')
    await waitFor(() => expect(groupService.getGroupMembers).toHaveBeenCalledWith('g2'))
    expect(groupService.getGroupMembers).toHaveBeenCalledTimes(2)
  })
})

describe('useGroupShows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(groupService.getGroupShows).mockResolvedValue([])
  })

  it('returns loading initially', () => {
    const { result } = renderHook(() => useGroupShows('g1'))
    expect(result.current.loading).toBe(true)
  })

  it('fetches and sets shows', async () => {
    vi.mocked(groupService.getGroupShows).mockResolvedValue(mockShows)

    const { result } = renderHook(() => useGroupShows('g1'))

    await waitFor(() => expect(result.current.shows).toEqual(mockShows))
    expect(groupService.getGroupShows).toHaveBeenCalledWith('g1')
  })

  it('handles empty shows', async () => {
    const { result } = renderHook(() => useGroupShows('g1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shows).toEqual([])
  })

  it('returns empty when groupId is undefined', () => {
    const { result } = renderHook(() => useGroupShows(undefined))
    expect(result.current.shows).toEqual([])
  })
})

describe('useGroupProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(groupService.getGroupEpisodeProgress).mockResolvedValue([])
  })

  it('returns loading initially', () => {
    const { result } = renderHook(() => useGroupProgress('g1', 1))
    expect(result.current.loading).toBe(true)
    expect(result.current.progress).toEqual([])
  })

  it('returns empty when groupId or showId is undefined', () => {
    const { result: r1 } = renderHook(() => useGroupProgress(undefined, 1))
    expect(r1.current.progress).toEqual([])
    const { result: r2 } = renderHook(() => useGroupProgress('g1', undefined))
    expect(r2.current.progress).toEqual([])
  })

  it('fetches and sets progress', async () => {
    vi.mocked(groupService.getGroupEpisodeProgress).mockResolvedValue(mockProgress)

    const { result } = renderHook(() => useGroupProgress('g1', 1))

    await waitFor(() => expect(result.current.progress).toEqual(mockProgress))
    expect(groupService.getGroupEpisodeProgress).toHaveBeenCalledWith('g1', 1)
  })

  it('provides a refresh function that re-fetches', async () => {
    vi.mocked(groupService.getGroupEpisodeProgress).mockResolvedValue(mockProgress)

    const { result } = renderHook(() => useGroupProgress('g1', 1))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const newProgress = [{ episode_id: 102, user_ids: ['user-2'] }]
    vi.mocked(groupService.getGroupEpisodeProgress).mockResolvedValue(newProgress)
    await result.current.refresh()
    await waitFor(() => expect(result.current.progress).toEqual(newProgress))
  })

  it('refetches when groupId or showId changes', async () => {
    const { rerender } = renderHook(
      ({ gid, sid }: { gid: string | undefined; sid: number | undefined }) => useGroupProgress(gid, sid),
      { initialProps: { gid: 'g1' as string | undefined, sid: 1 as number | undefined } },
    )
    await waitFor(() => expect(groupService.getGroupEpisodeProgress).toHaveBeenCalledWith('g1', 1))

    rerender({ gid: 'g2', sid: 2 })
    await waitFor(() => expect(groupService.getGroupEpisodeProgress).toHaveBeenCalledWith('g2', 2))
    expect(groupService.getGroupEpisodeProgress).toHaveBeenCalledTimes(2)
  })
})
