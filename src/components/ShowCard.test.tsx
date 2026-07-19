import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShowCard from './ShowCard'
import { I18nProvider } from '../lib/I18nContext'

function renderWithRouter(element: React.ReactElement) {
  return render(<MemoryRouter><I18nProvider>{element}</I18nProvider></MemoryRouter>)
}

describe('ShowCard', () => {
  const baseProps = { id: 1, name: 'Breaking Bad', posterUrl: null, imdbRating: null }

  it('renders show name in heading', () => {
    renderWithRouter(<ShowCard {...baseProps} />)
    expect(screen.getByRole('heading', { name: 'Breaking Bad' })).toBeInTheDocument()
  })

  it('links to show detail page', () => {
    renderWithRouter(<ShowCard {...baseProps} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/show/1')
  })

  it('shows IMDb rating when provided', () => {
    renderWithRouter(<ShowCard {...baseProps} imdbRating={8.5} />)
    expect(screen.getByText(/IMDb/)).toBeInTheDocument()
    expect(screen.getByText(/8\.5/)).toBeInTheDocument()
  })

  it('does not show IMDb rating when null', () => {
    renderWithRouter(<ShowCard {...baseProps} />)
    expect(screen.queryByText(/IMDb/)).not.toBeInTheDocument()
  })

  it('renders poster image when posterUrl is provided', () => {
    renderWithRouter(<ShowCard {...baseProps} posterUrl="https://example.com/poster.jpg" />)
    const img = screen.getByAltText('Breaking Bad poster')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/poster.jpg')
  })

  it('renders no img element when posterUrl is null', () => {
    renderWithRouter(<ShowCard {...baseProps} posterUrl={null} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows episode count when episodeCount is provided', () => {
    renderWithRouter(<ShowCard {...baseProps} episodeCount={62} />)
    expect(screen.getByText(/62/)).toBeInTheDocument()
  })

  it('does not show episode count when not provided', () => {
    renderWithRouter(<ShowCard {...baseProps} />)
    expect(screen.queryByText(/eps/)).not.toBeInTheDocument()
  })

  it('has accessible aria-label on link that includes show name and rating', () => {
    renderWithRouter(<ShowCard {...baseProps} imdbRating={9.5} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('aria-label')).toContain('Breaking Bad')
    expect(link.getAttribute('aria-label')).toContain('9.5')
  })

  it('uses lazy loading for poster images', () => {
    renderWithRouter(<ShowCard {...baseProps} posterUrl="https://example.com/poster.jpg" />)
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy')
  })
})
