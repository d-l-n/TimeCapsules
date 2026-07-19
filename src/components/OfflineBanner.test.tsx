import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import OfflineBanner from './OfflineBanner'
import { I18nProvider } from '../lib/I18nContext'

vi.mock('../hooks', () => ({
  useOnlineStatus: vi.fn(),
}))

const { useOnlineStatus } = await import('../hooks')

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.mocked(useOnlineStatus).mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when online', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true)
    const { container } = render(<OfflineBanner />, { wrapper })
    expect(container.firstChild).toBeNull()
  })

  it('renders banner when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    render(<OfflineBanner />, { wrapper })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays offline title text when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    render(<OfflineBanner />, { wrapper })
    expect(screen.getByText(/OFFLINE/i)).toBeInTheDocument()
  })

  it('has correct ARIA role for screen readers', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    render(<OfflineBanner />, { wrapper })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('disappears when connection is restored', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    const { rerender } = render(<OfflineBanner />, { wrapper })
    expect(screen.getByRole('status')).toBeInTheDocument()

    vi.mocked(useOnlineStatus).mockReturnValue(true)
    rerender(
      <I18nProvider>
        <OfflineBanner />
      </I18nProvider>
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
