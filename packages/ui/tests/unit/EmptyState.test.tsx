import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { EmptyState } from '../../src/components/custom/EmptyState'

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No projects" description="Start by creating one." />)
    expect(screen.getByText('No projects')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<EmptyState title="No projects" description="Start by creating one." />)
    expect(screen.getByText('Start by creating one.')).toBeInTheDocument()
  })

  it('does not render action button when action prop is absent', () => {
    render(<EmptyState title="Empty" description="Nothing here." />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders action button with correct label when action is provided', () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing here."
        action={{ label: 'Create project', onClick: vi.fn() }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Create project' })).toBeInTheDocument()
  })

  it('calls action.onClick when the CTA button is clicked', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Empty"
        description="Nothing here."
        action={{ label: 'Create', onClick }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders the illustration placeholder circle', () => {
    const { container } = render(<EmptyState title="Empty" description="Nothing here." />)
    // Beige illustration placeholder div is always rendered
    expect(container.querySelector('.rounded-full')).toBeInTheDocument()
  })

  it('applies additional className to the wrapper', () => {
    const { container } = render(
      <EmptyState title="T" description="D" className="my-class" />,
    )
    expect(container.firstChild).toHaveClass('my-class')
  })
})
