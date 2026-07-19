import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNavVisibility } from './useNavVisibility'

function createScrollableContainer() {
  const el = document.createElement('div')
  el.className = 'app-content'
  Object.defineProperty(el, 'scrollHeight', { value: 2000, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: 800, configurable: true })
  Object.defineProperty(el, 'scrollTop', { value: 0, writable: true, configurable: true })
  document.body.appendChild(el)
  return el
}

describe('useNavVisibility', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    container = createScrollableContainer()
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 })
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 899px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    container?.remove()
  })

  it('starts with nav and chrome visible', () => {
    const { result } = renderHook(() => useNavVisibility())
    expect(result.current.navHiddenByScroll).toBe(false)
    expect(result.current.chromeHiddenByScroll).toBe(false)
  })

  it('returns isMobileBottomBar based on viewport width', () => {
    const { result } = renderHook(() => useNavVisibility())
    expect(result.current.isMobileBottomBar).toBe(true)
  })

  it('hides nav on scroll down', () => {
    const { result } = renderHook(() => useNavVisibility())
    container.scrollTop = 100
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    act(() => vi.advanceTimersByTime(10))

    container.scrollTop = 160
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    act(() => vi.advanceTimersByTime(10))

    expect(result.current.navHiddenByScroll).toBe(true)
    expect(result.current.chromeHiddenByScroll).toBe(true)
  })

  it('shows nav when scrolling to top edge', () => {
    const { result } = renderHook(() => useNavVisibility())

    container.scrollTop = 100
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    container.scrollTop = 160
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    act(() => vi.advanceTimersByTime(10))
    expect(result.current.navHiddenByScroll).toBe(true)

    container.scrollTop = 8
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    act(() => vi.advanceTimersByTime(10))
    expect(result.current.navHiddenByScroll).toBe(false)
  })

  it('shows nav after idle timeout', () => {
    const { result } = renderHook(() => useNavVisibility())

    container.scrollTop = 100
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    container.scrollTop = 160
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    act(() => vi.advanceTimersByTime(10))
    expect(result.current.navHiddenByScroll).toBe(true)

    act(() => vi.advanceTimersByTime(300))
    expect(result.current.navHiddenByScroll).toBe(false)
    expect(result.current.chromeHiddenByScroll).toBe(false)
  })

  it('resets state on pathname change', () => {
    const { result, rerender } = renderHook(
      ({ pathname }) => useNavVisibility({ pathname }),
      { initialProps: { pathname: '/dashboard' } },
    )

    container.scrollTop = 100
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    container.scrollTop = 160
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    act(() => vi.advanceTimersByTime(10))
    expect(result.current.navHiddenByScroll).toBe(true)

    rerender({ pathname: '/profile' })
    expect(result.current.navHiddenByScroll).toBe(false)
    expect(result.current.chromeHiddenByScroll).toBe(false)
  })

  it('does not hide when showNotifPanel is true', () => {
    const { result } = renderHook(() => useNavVisibility({ showNotifPanel: true }))

    container.scrollTop = 100
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    container.scrollTop = 160
    act(() => document.dispatchEvent(new Event('scroll', { bubbles: false })))
    act(() => vi.advanceTimersByTime(10))

    expect(result.current.navHiddenByScroll).toBe(false)
    expect(result.current.chromeHiddenByScroll).toBe(false)
  })
})
