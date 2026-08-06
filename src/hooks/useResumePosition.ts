import { useCallback, useRef, useState } from 'react'
import { setResumePosition } from '../services/showService'
import type { ShowDoc } from '../lib/firebase-queries'
import { fmtPos } from '../components/show-detail/types'

function parsePosition(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const parts = trimmed.split(':')
  if (parts.length === 1) {
    const n = parseInt(parts[0])
    return isNaN(n) ? null : n
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0])
    const s = parseInt(parts[1])
    if (isNaN(m) || isNaN(s)) return null
    return m * 60 + s
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0])
    const m = parseInt(parts[1])
    const s = parseInt(parts[2])
    if (isNaN(h) || isNaN(m) || isNaN(s)) return null
    return h * 3600 + m * 60 + s
  }
  return null
}

export function useResumePosition(
  uid: string | undefined,
  show: ShowDoc | null,
  setResumePositions: React.Dispatch<React.SetStateAction<Map<number, number>>>
) {
  const [editingPosition, setEditingPosition] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const editValueRef = useRef(editValue)
  editValueRef.current = editValue

  const handleResumeClick = useCallback((contentId: number, currentSeconds: number | undefined) => {
    setEditingPosition(contentId)
    setEditValue(currentSeconds !== undefined ? fmtPos(currentSeconds) : '')
    requestAnimationFrame(() => editInputRef.current?.focus())
  }, [])

  const handleResumeSave = useCallback(async (contentId: number, contentType: 'episode' | 'movie') => {
    if (!uid || !show) return
    const trimmed = editValueRef.current.trim()
    if (!trimmed) { setEditingPosition(null); setEditValue(''); return }
    const seconds = parsePosition(trimmed)
    if (seconds === null) { setEditingPosition(null); setEditValue(''); return }
    setEditingPosition(null)
    setEditValue('')
    try {
      await setResumePosition(uid, contentId, show.tmdb_id, contentType, seconds)
      setResumePositions(prev => {
        const next = new Map(prev)
        next.set(contentId, seconds)
        return next
      })
    } catch (e) { console.warn('setResumePosition failed', e) }
  }, [uid, show, setResumePositions])

  const handlePresetPosition = useCallback(async (contentId: number, contentType: 'episode' | 'movie', seconds: number) => {
    if (!uid || !show) return
    setEditValue(fmtPos(seconds))
    try {
      await setResumePosition(uid, contentId, show.tmdb_id, contentType, seconds)
      setResumePositions(prev => {
        const next = new Map(prev)
        next.set(contentId, seconds)
        return next
      })
    } catch (e) { console.warn('setResumePosition failed', e) }
  }, [uid, show, setResumePositions])

  const handleClearPosition = useCallback(async (contentId: number, contentType: 'episode' | 'movie') => {
    if (!uid || !show) return
    setEditValue('')
    try {
      await setResumePosition(uid, contentId, show.tmdb_id, contentType, null)
      setResumePositions(prev => {
        const next = new Map(prev)
        next.delete(contentId)
        return next
      })
    } catch (e) { console.warn('setResumePosition failed', e) }
  }, [uid, show, setResumePositions])

  const handleResumeKeyDown = useCallback((e: React.KeyboardEvent, contentId: number, contentType: 'episode' | 'movie') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleResumeSave(contentId, contentType)
    }
    if (e.key === 'Escape') {
      setEditingPosition(null)
      setEditValue('')
    }
  }, [handleResumeSave])

  return {
    editingPosition,
    editValue,
    setEditValue,
    editInputRef,
    handleResumeClick,
    handleResumeSave,
    handlePresetPosition,
    handleClearPosition,
    handleResumeKeyDown,
  }
}
