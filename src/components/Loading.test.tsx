import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Loading from './Loading'

describe('Loading', () => {
  it('renders default loading text', () => {
    render(<Loading />)
    expect(screen.getByText('LOADING...')).toBeInTheDocument()
  })

  it('renders custom loading text', () => {
    render(<Loading text="CARGANDO..." />)
    expect(screen.getByText('CARGANDO...')).toBeInTheDocument()
  })

  it('has role status for accessibility', () => {
    render(<Loading />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has aria-live polite for screen readers', () => {
    render(<Loading />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})
