import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { PlanBadge } from '../../src/components/custom/PlanBadge'

describe('PlanBadge', () => {
  it('renders "Free" label for free plan', () => {
    render(<PlanBadge plan="free" />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('renders "Pro" label for pro plan', () => {
    render(<PlanBadge plan="pro" />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('renders "Enterprise" label for enterprise plan', () => {
    render(<PlanBadge plan="enterprise" />)
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
  })

  it('applies slate background for free plan', () => {
    const { container } = render(<PlanBadge plan="free" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-slate-100')
  })

  it('applies brand-brown background (#8B6F47) for pro plan', () => {
    const { container } = render(<PlanBadge plan="pro" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-[#8B6F47]')
  })

  it('applies dark background for enterprise plan', () => {
    const { container } = render(<PlanBadge plan="enterprise" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-slate-800')
  })

  it('applies white text for pro plan', () => {
    const { container } = render(<PlanBadge plan="pro" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('text-white')
  })

  it('has correct aria-label', () => {
    const { container } = render(<PlanBadge plan="pro" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveAttribute('aria-label', 'Plan: Pro')
  })

  it('accepts and applies additional className', () => {
    const { container } = render(<PlanBadge plan="free" className="my-custom-class" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('my-custom-class')
  })

  it('matches snapshot for all three plans', () => {
    const { container } = render(
      <div>
        <PlanBadge plan="free" />
        <PlanBadge plan="pro" />
        <PlanBadge plan="enterprise" />
      </div>,
    )
    expect(container).toMatchSnapshot()
  })
})
