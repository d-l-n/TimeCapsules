import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<EmptyState title="No shows found" description="Import your data first." />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('renders title', () => {
    render(<EmptyState title="No shows found" />)
    expect(screen.getByText('No shows found')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Import your data first." />)
    expect(screen.getByText('Import your data first.')).toBeInTheDocument()
  })

  it('does not render description when omitted', () => {
    const { container } = render(<EmptyState title="Empty" />)
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })

  it('renders children when provided', () => {
    render(<EmptyState title="Not found"><a href="/back">Go back</a></EmptyState>)
    expect(screen.getByText('Go back')).toBeInTheDocument()
  })
})
