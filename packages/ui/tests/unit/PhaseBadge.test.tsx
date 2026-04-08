import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { PhaseBadge } from '../../src/components/custom/PhaseBadge'

const PHASE_LABELS = ['Validate', 'Plan', 'Design', 'Build', 'Deploy', 'Growth'] as const

describe('PhaseBadge', () => {
  it.each([1, 2, 3, 4, 5, 6] as const)('renders correct label for phase %i', (phase) => {
    render(<PhaseBadge phase={phase} />)
    const label = PHASE_LABELS[phase - 1]
    expect(screen.getByText(label!)).toBeInTheDocument()
  })

  it.each([1, 2, 3, 4, 5, 6] as const)('renders phase number for phase %i', (phase) => {
    render(<PhaseBadge phase={phase} />)
    expect(screen.getByText(String(phase))).toBeInTheDocument()
  })

  it('applies violet color class for phase 1', () => {
    const { container } = render(<PhaseBadge phase={1} />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-violet-100')
    expect(badge).toHaveClass('text-violet-800')
  })

  it('applies teal color class for phase 4', () => {
    const { container } = render(<PhaseBadge phase={4} />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-teal-100')
    expect(badge).toHaveClass('text-teal-800')
  })

  it('applies green color class for phase 6', () => {
    const { container } = render(<PhaseBadge phase={6} />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-green-100')
    expect(badge).toHaveClass('text-green-800')
  })

  it('applies smaller text class when size=sm', () => {
    const { container } = render(<PhaseBadge phase={1} size="sm" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('text-[10px]')
  })

  it('applies px-2.5 padding when size=md (default)', () => {
    const { container } = render(<PhaseBadge phase={1} size="md" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('px-2.5')
  })

  it('has correct aria-label with phase number and label', () => {
    const { container } = render(<PhaseBadge phase={3} />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveAttribute('aria-label', 'Phase 3: Design')
  })

  it('matches snapshot for all 6 phases', () => {
    const { container } = render(
      <div>
        {([1, 2, 3, 4, 5, 6] as const).map((p) => (
          <PhaseBadge key={p} phase={p} />
        ))}
      </div>,
    )
    expect(container).toMatchSnapshot()
  })
})
