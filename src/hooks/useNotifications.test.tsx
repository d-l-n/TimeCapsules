import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useNotifications } from './useNotifications'

vi.mock('../services/notificationService', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  checkUpcomingEpisodes: vi.fn().mockResolvedValue(undefined),
}))

import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/notificationService'
const mockedGetNotifications = vi.mocked(getNotifications)
const mockedGetUnreadCount = vi.mocked(getUnreadCount)
const mockedMarkAsRead = vi.mocked(markAsRead)
const mockedMarkAllAsRead = vi.mocked(markAllAsRead)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('useNotifications', () => {
  it('returns empty when uid is undefined', async () => {
    const { result } = renderHook(() => useNotifications(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notifications).toEqual([])
    expect(result.current.unreadCount).toBe(0)
    expect(mockedGetNotifications).not.toHaveBeenCalled()
  })

  it('fetches notifications on mount', async () => {
    const mockNotifs = [{ id: 'n1', title: 'New episode', body: '...', read: false }]
    mockedGetNotifications.mockResolvedValue(mockNotifs as any)
    mockedGetUnreadCount.mockResolvedValue(1)

    const { result } = renderHook(() => useNotifications('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notifications).toEqual(mockNotifs)
    expect(result.current.unreadCount).toBe(1)
  })

  it('markAsRead updates notification read state', async () => {
    const mockNotifs = [
      { id: 'n1', title: 'Ep 1', body: '...', read: false },
      { id: 'n2', title: 'Ep 2', body: '...', read: false },
    ]
    mockedGetNotifications.mockResolvedValue(mockNotifs as any)
    mockedGetUnreadCount.mockResolvedValue(2)
    mockedMarkAsRead.mockResolvedValue(undefined as any)

    const { result } = renderHook(() => useNotifications('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.markAsRead('n1'))
    expect(mockedMarkAsRead).toHaveBeenCalledWith('n1')
    expect(result.current.unreadCount).toBe(1)
    expect(result.current.notifications.find(n => n.id === 'n1')?.read).toBe(true)
  })

  it('markAllAsRead clears all unread', async () => {
    const mockNotifs = [
      { id: 'n1', title: 'Ep 1', body: '...', read: false },
      { id: 'n2', title: 'Ep 2', body: '...', read: false },
    ]
    mockedGetNotifications.mockResolvedValue(mockNotifs as any)
    mockedGetUnreadCount.mockResolvedValue(2)
    mockedMarkAllAsRead.mockResolvedValue(undefined as any)

    const { result } = renderHook(() => useNotifications('user1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.markAllAsRead())
    expect(mockedMarkAllAsRead).toHaveBeenCalledWith('user1')
    expect(result.current.unreadCount).toBe(0)
    expect(result.current.notifications.every(n => n.read)).toBe(true)
  })
})
