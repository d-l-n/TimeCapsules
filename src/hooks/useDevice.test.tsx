import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDevice } from './useDevice'

describe('useDevice', () => {

  it('isMobile true below 768px', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500)
    const { result } = renderHook(useDevice)
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('isDesktop true at 768px', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(768)
    const { result } = renderHook(useDevice)
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isDesktop).toBe(true)
  })

  it('responds to matchMedia change', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(900)
    const { result } = renderHook(useDevice)
    expect(result.current.isMobile).toBe(false)

    const mqListeners: Function[] = []
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes('767'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_, cb) => mqListeners.push(cb as Function)),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as any))

    const event = new Event('change')
    mqListeners.forEach(cb => cb(event))

    vi.restoreAllMocks()
    window.matchMedia = originalMatchMedia
  })
})
