import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNavVisibility } from './useNavVisibility'

describe('useNavVisibility', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with nav visible', () => {
    const { result } = renderHook(() => useNavVisibility())
    expect(result.current.navHiddenByScroll).toBe(false)
  })

  it('hides nav when scrolling down past 50px', () => {
    const { result } = renderHook(() => useNavVisibility())

    act(() => {
      window.scrollY = 100
      window.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.navHiddenByScroll).toBe(true)
  })

  it('shows nav when scrolling back up', () => {
    const { result } = renderHook(() => useNavVisibility())

    act(() => {
      window.scrollY = 100
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current.navHiddenByScroll).toBe(true)

    act(() => {
      window.scrollY = 60
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current.navHiddenByScroll).toBe(false)
  })

  it('does not hide when showNotifPanel is true', () => {
    const { result } = renderHook(() => useNavVisibility({ showNotifPanel: true }))

    act(() => {
      window.scrollY = 100
      window.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.navHiddenByScroll).toBe(false)
  })
})
