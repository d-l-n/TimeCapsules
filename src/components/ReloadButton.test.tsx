import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import ReloadButton from './ReloadButton'
import { I18nProvider } from '../lib/I18nContext'

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('ReloadButton', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        getRegistration: vi.fn(),
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as any).__swPendingReload
    delete (window as any).__swReloadTimer
  })

  it('renders nothing when no update is available', () => {
    const { container } = render(<ReloadButton />, { wrapper })
    expect(container.firstChild).toBeNull()
  })

  it('renders button after sw-update-available event fires', () => {
    render(<ReloadButton />, { wrapper })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    fireEvent(window, new Event('sw-update-available'))
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('button contains update text', () => {
    render(<ReloadButton />, { wrapper })
    fireEvent(window, new Event('sw-update-available'))
    expect(screen.getByRole('button')).toHaveTextContent(/UPDATE/i)
  })

  it('sets __swPendingReload flag on click', () => {
    vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue(undefined)
    render(<ReloadButton />, { wrapper })
    fireEvent(window, new Event('sw-update-available'))

    fireEvent.click(screen.getByRole('button'))
    expect((window as any).__swPendingReload).toBe(true)
  })

  it('calls location.reload when no service worker registration exists', async () => {
    vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue(undefined)
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', { value: { reload: reloadSpy }, writable: true, configurable: true })

    render(<ReloadButton />, { wrapper })
    fireEvent(window, new Event('sw-update-available'))
    fireEvent.click(screen.getByRole('button'))

    await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalledOnce())
  })

  it('posts SKIP_WAITING to waiting service worker', async () => {
    const postMessageSpy = vi.fn()
    const mockReg = { waiting: { postMessage: postMessageSpy } } as unknown as ServiceWorkerRegistration
    vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue(mockReg)

    render(<ReloadButton />, { wrapper })
    fireEvent(window, new Event('sw-update-available'))
    fireEvent.click(screen.getByRole('button'))

    await vi.waitFor(() => expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SKIP_WAITING' }))
  })

  it('renders complete text after sw-update-complete event fires', () => {
    render(<ReloadButton />, { wrapper })
    // Button must be visible first (sw-update-available makes it visible)
    fireEvent(window, new Event('sw-update-available'))
    expect(screen.getByRole('button')).toHaveTextContent(/UPDATE/i)

    // Fire sw-update-complete
    fireEvent(window, new Event('sw-update-complete'))
    expect(screen.getByRole('button')).toHaveTextContent(/COMPLETE/i)
  })

  it('button is disabled when complete', () => {
    render(<ReloadButton />, { wrapper })
    fireEvent(window, new Event('sw-update-available'))
    fireEvent(window, new Event('sw-update-complete'))

    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })

  it('click does nothing when complete', async () => {
    const getRegSpy = vi.spyOn(navigator.serviceWorker, 'getRegistration')
    render(<ReloadButton />, { wrapper })
    fireEvent(window, new Event('sw-update-available'))
    fireEvent(window, new Event('sw-update-complete'))

    fireEvent.click(screen.getByRole('button'))
    // getRegistration should not be called because guard clause prevents it
    expect(getRegSpy).not.toHaveBeenCalled()
  })

  it('removes both event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<ReloadButton />, { wrapper })
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('sw-update-available', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('sw-update-complete', expect.any(Function))
  })
})
