import { useState, useEffect, useCallback } from 'react'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, checkUpcomingEpisodes } from '../services/notificationService'
import type { NotificationDoc } from '../lib/firebase-queries'

export function useNotifications(uid: string | undefined) {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!uid) { setNotifications([]); setUnreadCount(0); setLoading(false); return }
    const [notifs, count] = await Promise.all([
      getNotifications(uid),
      getUnreadCount(uid),
    ])
    setNotifications(notifs)
    setUnreadCount(count)
    setLoading(false)
  }, [uid])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    if (!uid) return
    const lastCheck = localStorage.getItem('lastNotifCheck')
    const today = new Date().toDateString()
    if (lastCheck !== today) {
      checkUpcomingEpisodes(uid).then(() => {
        localStorage.setItem('lastNotifCheck', today)
        refresh()
      })
    }
  }, [uid, refresh])

  const handleMarkRead = useCallback(async (id: string) => {
    await markAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    if (!uid) return
    await markAllAsRead(uid)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [uid])

  return { notifications, unreadCount, loading, markAsRead: handleMarkRead, markAllAsRead: handleMarkAllRead, refresh }
}
