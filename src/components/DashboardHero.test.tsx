import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../lib/I18nContext'
import DashboardHero from './DashboardHero'

vi.mock('../lib/AuthContext', () => ({
  useAuth: () => ({ user: { displayName: 'Test', email: 'test@example.com' } }),
}))

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <I18nProvider>{children}</I18nProvider>
    </MemoryRouter>
  )
}

describe('DashboardHero', () => {
  it('renders episodes watched count', () => {
    render(<DashboardHero streak={0} episodesWatched={500} showsTracked={10} timeSpent={1200} />, { wrapper })
    expect(screen.getAllByText(/500/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders shows tracked count', () => {
    render(<DashboardHero streak={0} episodesWatched={500} showsTracked={10} timeSpent={1200} />, { wrapper })
    expect(screen.getByText(/10/)).toBeInTheDocument()
  })

  it('renders time spent as formatted hours', () => {
    render(<DashboardHero streak={0} episodesWatched={500} showsTracked={10} timeSpent={1200} />, { wrapper })
    expect(screen.getByText(/20h/)).toBeInTheDocument()
  })

  it('shows streak when > 1', () => {
    render(<DashboardHero streak={5} episodesWatched={100} showsTracked={10} timeSpent={1200} />, { wrapper })
    expect(screen.getByText(/day streak/i)).toBeInTheDocument()
  })

  it('does not show streak when 1', () => {
    render(<DashboardHero streak={1} episodesWatched={500} showsTracked={10} timeSpent={1200} />, { wrapper })
    expect(screen.queryByText(/day streak/i)).not.toBeInTheDocument()
  })

  it('does not show streak when 0', () => {
    render(<DashboardHero streak={0} episodesWatched={500} showsTracked={10} timeSpent={1200} />, { wrapper })
    expect(screen.queryByText(/day streak/i)).not.toBeInTheDocument()
  })

  it('episodes link points to profile history tab', () => {
    render(<DashboardHero streak={0} episodesWatched={500} showsTracked={10} timeSpent={1200} />, { wrapper })
    const links = screen.getAllByRole('link')
    const historyLink = links.find(l => l.getAttribute('href')?.includes('profile?section=history'))
    expect(historyLink).toBeInTheDocument()
  })

  it('time spent link points to profile stats tab', () => {
    render(<DashboardHero streak={0} episodesWatched={500} showsTracked={10} timeSpent={1200} />, { wrapper })
    const links = screen.getAllByRole('link')
    const statsLink = links.find(l => l.getAttribute('href')?.includes('profile?section=stats'))
    expect(statsLink).toBeInTheDocument()
  })

  it('streak link points to stats page', () => {
    render(<DashboardHero streak={5} episodesWatched={100} showsTracked={10} timeSpent={1200} />, { wrapper })
    const links = screen.getAllByRole('link')
    const streakLink = links.find(l => l.getAttribute('href') === '/stats')
    expect(streakLink).toBeInTheDocument()
  })

  it('renders shows tracked as non-link element', () => {
    render(<DashboardHero streak={0} episodesWatched={500} showsTracked={10} timeSpent={1200} />, { wrapper })
    expect(screen.getByText(/Shows Tracked/i)).toBeInTheDocument()
  })

  it('formats large episode counts with locale separators', () => {
    render(<DashboardHero streak={0} episodesWatched={1500} showsTracked={42} timeSpent={1200} />, { wrapper })
    const expected = (1500).toLocaleString()
    expect(screen.getByText(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
  })
})
