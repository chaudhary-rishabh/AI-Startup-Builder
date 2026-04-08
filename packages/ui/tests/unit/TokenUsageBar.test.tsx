import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { TokenUsageBar } from '../../src/components/custom/TokenUsageBar'

describe('TokenUsageBar', () => {
  it('shows correct percentage for basic usage', () => {
    render(<TokenUsageBar used={250_000} limit={500_000} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows used and limit label text', () => {
    render(<TokenUsageBar used={25_000} limit={500_000} />)
    expect(screen.getByText(/25K.*500K/)).toBeInTheDocument()
  })

  it('formats millions correctly', () => {
    render(<TokenUsageBar used={1_500_000} limit={2_000_000} />)
    expect(screen.getByText(/1\.5M.*2\.0M/)).toBeInTheDocument()
  })

  it('applies green bar class when usage < 80%', () => {
    const { container } = render(<TokenUsageBar used={250_000} limit={500_000} />)
    const bar = container.querySelector('.bg-green-500')
    expect(bar).toBeInTheDocument()
  })

  it('applies amber bar class when usage is between 80% and 95%', () => {
    const { container } = render(<TokenUsageBar used={420_000} limit={500_000} />)
    const bar = container.querySelector('.bg-amber-400')
    expect(bar).toBeInTheDocument()
  })

  it('applies red bar class when usage > 95%', () => {
    const { container } = render(<TokenUsageBar used={490_000} limit={500_000} />)
    const bar = container.querySelector('.bg-red-500')
    expect(bar).toBeInTheDocument()
  })

  it('applies amber color at 81% (just above the >80 threshold)', () => {
    // getBarColor uses pct > 80 (strictly), so 80% = green, 81% = amber
    const { container } = render(<TokenUsageBar used={405_000} limit={500_000} />)
    expect(container.querySelector('.bg-amber-400')).toBeInTheDocument()
  })

  it('shows 100% when fully used', () => {
    render(<TokenUsageBar used={500_000} limit={500_000} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('clamps percentage to 100 when used exceeds limit', () => {
    render(<TokenUsageBar used={600_000} limit={500_000} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('renders role=meter with correct aria attributes at 50%', () => {
    const { container } = render(<TokenUsageBar used={250_000} limit={500_000} />)
    const meter = container.querySelector('[role="meter"]')
    expect(meter).toHaveAttribute('aria-valuenow', '50')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
  })

  it('applies green text color when below 80%', () => {
    render(<TokenUsageBar used={25_000} limit={500_000} />)
    const pct = screen.getByText('5%')
    expect(pct).toHaveClass('text-green-700')
  })

  it('applies amber text color when 80–95%', () => {
    render(<TokenUsageBar used={420_000} limit={500_000} />)
    const pct = screen.getByText('84%')
    expect(pct).toHaveClass('text-amber-600')
  })

  it('applies red text color when above 95%', () => {
    render(<TokenUsageBar used={490_000} limit={500_000} />)
    const pct = screen.getByText('98%')
    expect(pct).toHaveClass('text-red-600')
  })
})
