import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDevice } from './useDevice'

describe('useDevice', () => {
  let mobileMqMock: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> }
  let sidebarMqMock: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mobileMqMock = {
      matches: false,
      addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        mobileMqMock.addEventListener = handler as unknown as ReturnType<typeof vi.fn>
      }),
      removeEventListener: vi.fn(),
    }
    sidebarMqMock = {
      matches: false,
      addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        sidebarMqMock.addEventListener = handler as unknown as ReturnType<typeof vi.fn>
      }),
      removeEventListener: vi.fn(),
    }
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      if (query.includes('767')) return mobileMqMock as unknown as MediaQueryList
      if (query.includes('1099')) return sidebarMqMock as unknown as MediaQueryList
      return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.innerWidth = 1100
  })

  it('returns isMobile=true when window width < 768', () => {
    window.innerWidth = 375
    mobileMqMock.matches = true
    const { result } = renderHook(() => useDevice())
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('returns isDesktop=true when window width >= 768', () => {
    mobileMqMock.matches = false
    const { result } = renderHook(() => useDevice())
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isMobile).toBe(false)
  })

  it('returns isDesktop=true at exactly 768px', () => {
    mobileMqMock.matches = false
    const { result } = renderHook(() => useDevice())
    expect(result.current.isDesktop).toBe(true)
  })

  it('returns isSidebarCollapsed=true when window width < 1100', () => {
    window.innerWidth = 800
    sidebarMqMock.matches = true
    const { result } = renderHook(() => useDevice())
    expect(result.current.isSidebarCollapsed).toBe(true)
  })

  it('returns isSidebarCollapsed=false when window width >= 1100', () => {
    sidebarMqMock.matches = false
    const { result } = renderHook(() => useDevice())
    expect(result.current.isSidebarCollapsed).toBe(false)
  })

  it('mobile=true + sidebarCollapsed=true below 768', () => {
    window.innerWidth = 600
    mobileMqMock.matches = true
    sidebarMqMock.matches = true
    const { result } = renderHook(() => useDevice())
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isSidebarCollapsed).toBe(true)
  })

  it('updates on media query change (mobile breakpoint)', () => {
    mobileMqMock.matches = false
    const { result } = renderHook(() => useDevice())
    expect(result.current.isDesktop).toBe(true)

    act(() => {
      mobileMqMock.matches = true
      if (typeof mobileMqMock.addEventListener === 'function') {
        ;(mobileMqMock.addEventListener as unknown as (e: { matches: boolean }) => void)({ matches: true })
      }
    })

    expect(result.current.isMobile).toBe(true)
  })

  it('updates on media query change (sidebar breakpoint)', () => {
    sidebarMqMock.matches = false
    const { result } = renderHook(() => useDevice())
    expect(result.current.isSidebarCollapsed).toBe(false)

    act(() => {
      sidebarMqMock.matches = true
      if (typeof sidebarMqMock.addEventListener === 'function') {
        ;(sidebarMqMock.addEventListener as unknown as (e: { matches: boolean }) => void)({ matches: true })
      }
    })

    expect(result.current.isSidebarCollapsed).toBe(true)
  })
})
