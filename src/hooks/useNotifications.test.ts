import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNotifications } from './useNotifications'
import { clearCache } from '../lib/hook-cache'

const mockNotifications = [
  { id: 'n1', user_id: 'user-1', type: 'upcoming_episode' as const, title: 'New Episode', body: 'S5E6 airs tomorrow', show_id: 1, read: false, created_at: '2024-01-15T20:00:00Z' },
  { id: 'n2', user_id: 'user-1', type: 'show_returning' as const, title: 'Show Returning', body: 'Returns in March', show_id: 2, read: true, created_at: '2024-01-10T20:00:00Z' },
]

vi.mock('../services/notificationService', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  checkUpcomingEpisodes: vi.fn(),
}))

const notifService = await import('../services/notificationService')

describe('useNotifications', () => {
  beforeEach(() => {
    clearCache()
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(notifService.getNotifications).mockResolvedValue([])
    vi.mocked(notifService.getUnreadCount).mockResolvedValue(0)
    vi.mocked(notifService.markAsRead).mockResolvedValue(undefined)
    vi.mocked(notifService.markAllAsRead).mockResolvedValue(undefined)
    vi.mocked(notifService.checkUpcomingEpisodes).mockResolvedValue(undefined)
  })

  it('returns loading initially', () => {
    const { result } = renderHook(() => useNotifications('user-1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.notifications).toEqual([])
    expect(result.current.unreadCount).toBe(0)
  })

  it('returns empty when uid is undefined', () => {
    const { result } = renderHook(() => useNotifications(undefined))
    expect(result.current.loading).toBe(false)
    expect(result.current.notifications).toEqual([])
    expect(result.current.unreadCount).toBe(0)
  })

  it('fetches and sets notifications and unread count', async () => {
    vi.mocked(notifService.getNotifications).mockResolvedValue(mockNotifications)
    vi.mocked(notifService.getUnreadCount).mockResolvedValue(1)

    const { result } = renderHook(() => useNotifications('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notifications).toEqual(mockNotifications)
    expect(result.current.unreadCount).toBe(1)
    expect(notifService.getNotifications).toHaveBeenCalledWith('user-1')
    expect(notifService.getUnreadCount).toHaveBeenCalledWith('user-1')
  })

  it('handles empty notifications', async () => {
    const { result } = renderHook(() => useNotifications('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notifications).toEqual([])
    expect(result.current.unreadCount).toBe(0)
  })

  it('markAsRead updates local state and calls service', async () => {
    vi.mocked(notifService.getNotifications).mockResolvedValue(mockNotifications)
    vi.mocked(notifService.getUnreadCount).mockResolvedValue(1)

    const { result } = renderHook(() => useNotifications('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.markAsRead('n1')
    expect(notifService.markAsRead).toHaveBeenCalledWith('n1')
    await waitFor(() => expect(result.current.unreadCount).toBe(0))
    const n1 = result.current.notifications.find(n => n.id === 'n1')
    expect(n1?.read).toBe(true)
  })

  it('markAllAsRead updates local state and calls service', async () => {
    vi.mocked(notifService.getNotifications).mockResolvedValue(mockNotifications)
    vi.mocked(notifService.getUnreadCount).mockResolvedValue(1)

    const { result } = renderHook(() => useNotifications('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.markAllAsRead()
    expect(notifService.markAllAsRead).toHaveBeenCalledWith('user-1')
    await waitFor(() => {
      expect(result.current.unreadCount).toBe(0)
      expect(result.current.notifications.every(n => n.read)).toBe(true)
    })
  })

  it('does not call checkUpcomingEpisodes when already checked today', async () => {
    const today = new Date().toDateString()
    localStorage.setItem('lastNotifCheck', today)

    renderHook(() => useNotifications('user-1'))

    await waitFor(() => expect(notifService.getNotifications).toHaveBeenCalled())
    expect(notifService.checkUpcomingEpisodes).not.toHaveBeenCalled()
  })

  it('calls checkUpcomingEpisodes once per day', async () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    localStorage.setItem('lastNotifCheck', yesterday)

    renderHook(() => useNotifications('user-1'))

    await waitFor(() => expect(notifService.checkUpcomingEpisodes).toHaveBeenCalledWith('user-1'))
    expect(localStorage.getItem('lastNotifCheck')).toBe(new Date().toDateString())
  })

  it('calls checkUpcomingEpisodes when never checked before', async () => {
    renderHook(() => useNotifications('user-1'))

    await waitFor(() => expect(notifService.checkUpcomingEpisodes).toHaveBeenCalledWith('user-1'))
  })

  it('provides a refresh function that re-fetches', async () => {
    vi.mocked(notifService.getNotifications).mockResolvedValue(mockNotifications)
    vi.mocked(notifService.getUnreadCount).mockResolvedValue(1)

    const { result } = renderHook(() => useNotifications('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.mocked(notifService.getNotifications).mockResolvedValue([mockNotifications[0]])
    vi.mocked(notifService.getUnreadCount).mockResolvedValue(0)
    await result.current.refresh()
    await waitFor(() => expect(result.current.unreadCount).toBe(0))
    expect(result.current.notifications).toHaveLength(1)
  })
})
