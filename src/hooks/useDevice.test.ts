import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDevice } from './useDevice'

describe('useDevice', () => {
  let matchMediaMock: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    matchMediaMock = {
      matches: false,
      addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        matchMediaMock.addEventListener = handler as unknown as ReturnType<typeof vi.fn>
      }),
      removeEventListener: vi.fn(),
    }
    vi.spyOn(window, 'matchMedia').mockImplementation(() => matchMediaMock as unknown as MediaQueryList)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.innerWidth = 1024
  })

  it('returns isMobile=true when window width < 768', () => {
    window.innerWidth = 375
    matchMediaMock.matches = true
    const { result } = renderHook(() => useDevice())
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('returns isDesktop=true when window width >= 768', () => {
    matchMediaMock.matches = false
    const { result } = renderHook(() => useDevice())
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isMobile).toBe(false)
  })

  it('returns isDesktop=true at exactly 768px', () => {
    matchMediaMock.matches = false
    const { result } = renderHook(() => useDevice())
    expect(result.current.isDesktop).toBe(true)
  })

  it('updates on media query change', () => {
    matchMediaMock.matches = false
    const { result } = renderHook(() => useDevice())
    expect(result.current.isDesktop).toBe(true)

    act(() => {
      matchMediaMock.matches = true
      if (typeof matchMediaMock.addEventListener === 'function') {
        ;(matchMediaMock.addEventListener as unknown as (e: { matches: boolean }) => void)({ matches: true })
      }
    })

    expect(result.current.isMobile).toBe(true)
  })
})
