import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ScrollToTop from './ScrollToTop'
import { I18nProvider } from '../lib/I18nContext'

const renderWithI18n = (ui: ReactElement) => render(<I18nProvider>{ui}</I18nProvider>)

describe('ScrollToTop', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when scrollY is 0', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    const { container } = renderWithI18n(<ScrollToTop />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when scrollY is below threshold', () => {
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true })
    const { container } = renderWithI18n(<ScrollToTop />)
    expect(container.firstChild).toBeNull()
  })

  it('renders button when scrollY is above 300', () => {
    Object.defineProperty(window, 'scrollY', { value: 301, configurable: true })
    renderWithI18n(<ScrollToTop />)

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 301, configurable: true })
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument()
  })

  it('button appears after scrolling past threshold', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    renderWithI18n(<ScrollToTop />)

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument()
  })

  it('button disappears when scrolling back above threshold', () => {
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    renderWithI18n(<ScrollToTop />)

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.getByRole('button')).toBeInTheDocument()

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls window.scrollTo on button click', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    renderWithI18n(<ScrollToTop />)

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    fireEvent.click(screen.getByRole('button', { name: /scroll to top/i }))
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('has accessible aria-label', () => {
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    renderWithI18n(<ScrollToTop />)
    act(() => { window.dispatchEvent(new Event('scroll')) })
    expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument()
  })

  it('removes scroll listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderWithI18n(<ScrollToTop />)
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
