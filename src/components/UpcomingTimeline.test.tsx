import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../lib/I18nContext'
import UpcomingTimeline from './UpcomingTimeline'

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <I18nProvider>{children}</I18nProvider>
    </MemoryRouter>
  )
}

const makeItem = (overrides: Partial<{
  show_id: number
  name: string
  poster_url: string | null
  daysUntil: number | null
  season_number: number
  episode_number: number
  episode_name: string | null
}> = {}) => ({
  show_id: overrides.show_id ?? 1,
  name: overrides.name ?? 'Breaking Bad',
  poster_url: overrides.poster_url ?? null,
  daysUntil: overrides.daysUntil ?? 3,
  next_episode: {
    id: 1,
    name: overrides.episode_name ?? 'Episode',
    air_date: '2026-07-19',
    season_number: overrides.season_number ?? 5,
    episode_number: overrides.episode_number ?? 1,
    still_path: null,
    overview: null,
  },
})

describe('UpcomingTimeline', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<UpcomingTimeline items={[]} />, { wrapper })
    expect(container.firstChild).toBeNull()
  })

  it('renders section heading', () => {
    const items = [makeItem()]
    render(<UpcomingTimeline items={items} />, { wrapper })
    expect(screen.getByText(/Upcoming Releases/i)).toBeInTheDocument()
  })

  it('renders VIEW ALL link to upcoming page', () => {
    const items = [makeItem()]
    render(<UpcomingTimeline items={items} />, { wrapper })
    const viewAll = screen.getByText(/VIEW ALL/i)
    expect(viewAll.closest('a')).toHaveAttribute('href', '/upcoming')
  })

  it('renders show name', () => {
    const items = [makeItem({ name: 'Stranger Things' })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    expect(screen.getByText(/Stranger Things/i)).toBeInTheDocument()
  })

  it('renders TODAY label for day 0 items', () => {
    const items = [makeItem({ daysUntil: 0 })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    expect(screen.getByText(/TODAY/)).toBeInTheDocument()
  })

  it('renders TOMORROW label for day 1 items', () => {
    const items = [makeItem({ daysUntil: 1 })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    expect(screen.getByText(/TOMORROW/)).toBeInTheDocument()
  })

  it('renders "X days" label for days > 1', () => {
    const items = [makeItem({ daysUntil: 5 })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    expect(screen.getByText(/5 days/i)).toBeInTheDocument()
  })

  it('groups items with same daysUntil under one label', () => {
    const items = [
      makeItem({ show_id: 1, name: 'Breaking Bad', daysUntil: 3 }),
      makeItem({ show_id: 2, name: 'Stranger Things', daysUntil: 3 }),
    ]
    render(<UpcomingTimeline items={items} />, { wrapper })
    expect(screen.getByText(/3 days/i)).toBeInTheDocument()
    expect(screen.getByText('Breaking Bad')).toBeInTheDocument()
    expect(screen.getByText('Stranger Things')).toBeInTheDocument()
  })

  it('shows season and episode info', () => {
    const items = [makeItem({ season_number: 5, episode_number: 2 })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    expect(screen.getByText(/S5/)).toBeInTheDocument()
    expect(screen.getByText(/E2/)).toBeInTheDocument()
  })

  it('shows episode name when provided', () => {
    const items = [makeItem({ episode_name: 'Ozymandias' })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    expect(screen.getByText(/Ozymandias/)).toBeInTheDocument()
  })

  it('renders poster image when poster_url is provided', () => {
    const items = [makeItem({ poster_url: 'https://example.com/poster.jpg' })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    const img = document.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/poster.jpg')
  })

  it('links each item to show detail page', () => {
    const items = [makeItem({ show_id: 42 })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    const link = Array.from(document.querySelectorAll('a')).find(l => l.getAttribute('href') === '/show/42')
    expect(link).toBeInTheDocument()
  })

  it('shows first letter of show name when no poster', () => {
    const items = [makeItem({ name: 'Arcane', poster_url: null })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    const showLink = Array.from(document.querySelectorAll('a')).find(l => l.getAttribute('href') === '/show/1')
    expect(showLink?.textContent).toContain('A')
  })

  it('renders items with null daysUntil as 999 group', () => {
    const items = [makeItem({ daysUntil: null, name: 'Arcane' })]
    render(<UpcomingTimeline items={items} />, { wrapper })
    expect(screen.getByText('Arcane')).toBeInTheDocument()
  })

  it('highlights TODAY group with highlight bg', () => {
    const items = [
      makeItem({ daysUntil: 0 }),
      makeItem({ show_id: 2, name: 'Later', daysUntil: 5 }),
    ]
    render(<UpcomingTimeline items={items} />, { wrapper })
    const todayLabel = screen.getByText(/TODAY/)
    expect(todayLabel.className).toContain('bg-highlight')
  })
})
