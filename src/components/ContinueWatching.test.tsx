import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../lib/I18nContext'
import ContinueWatching from './ContinueWatching'

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <I18nProvider>{children}</I18nProvider>
    </MemoryRouter>
  )
}

const makeItem = (overrides: Partial<{
  id: number
  name: string
  poster_url: string | null
  imdb_rating: number | null
  progress: number
  episodesWatched: number
  totalEpisodes: number
}> = {}) => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? 'Breaking Bad',
  poster_url: overrides.poster_url ?? null,
  imdb_rating: overrides.imdb_rating ?? null,
  progress: overrides.progress ?? 50,
  episodesWatched: overrides.episodesWatched ?? 3,
  totalEpisodes: overrides.totalEpisodes ?? 6,
})

describe('ContinueWatching', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<ContinueWatching items={[]} />, { wrapper })
    expect(container.firstChild).toBeNull()
  })

  it('renders section heading', () => {
    render(<ContinueWatching items={[makeItem()]} />, { wrapper })
    expect(screen.getByText(/Continue Watching/i)).toBeInTheDocument()
  })

  it('renders show name in card heading', () => {
    render(<ContinueWatching items={[makeItem({ name: 'Breaking Bad' })]} />, { wrapper })
    expect(screen.getByRole('heading', { name: /Breaking Bad/i })).toBeInTheDocument()
  })

  it('shows episode count for each item', () => {
    render(<ContinueWatching items={[makeItem({ episodesWatched: 3, totalEpisodes: 6 })]} />, { wrapper })
    expect(screen.getByText(/3\/6/)).toBeInTheDocument()
  })

  it('shows progress percentage text', () => {
    render(<ContinueWatching items={[makeItem({ progress: 75, episodesWatched: 6, totalEpisodes: 8 })]} />, { wrapper })
    expect(screen.getByText(/75%/)).toBeInTheDocument()
  })

  it('renders poster image when poster_url is provided', () => {
    render(<ContinueWatching items={[makeItem({ poster_url: 'https://example.com/poster.jpg' })]} />, { wrapper })
    const img = document.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/poster.jpg')
  })

  it('does not render img when poster_url is null', () => {
    render(<ContinueWatching items={[makeItem({ poster_url: null })]} />, { wrapper })
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })

  it('links each item to show detail page', () => {
    render(<ContinueWatching items={[makeItem({ id: 1 })]} />, { wrapper })
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/show/1')
  })

  it('has accessible aria-label on link with show name and progress', () => {
    render(<ContinueWatching items={[makeItem({ name: 'Breaking Bad', progress: 42 })]} />, { wrapper })
    const link = screen.getByRole('link')
    expect(link.getAttribute('aria-label')).toContain('Breaking Bad')
    expect(link.getAttribute('aria-label')).toContain('42%')
  })

  it('renders multiple items in a grid', () => {
    const items = [
      makeItem({ id: 1, name: 'Breaking Bad' }),
      makeItem({ id: 2, name: 'Stranger Things' }),
    ]
    render(<ContinueWatching items={items} />, { wrapper })
    expect(screen.getByRole('heading', { name: /Breaking Bad/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Stranger Things/i })).toBeInTheDocument()
  })

  it('applies progressive shimmer to progress bar', () => {
    render(<ContinueWatching items={[makeItem({ progress: 66, episodesWatched: 4, totalEpisodes: 6 })]} />, { wrapper })
    const progressBar = document.querySelector('[style*="width: 66%"]')
    expect(progressBar).toBeInTheDocument()
  })
})
