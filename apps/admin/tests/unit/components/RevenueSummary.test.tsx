import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RevenueSummary } from '@/components/billing/RevenueSummary'
import type { AdminRevenueSummary } from '@/types'

const summary: AdminRevenueSummary = {
  mrrCents: 2480000,
  arrCents: 29760000,
  churnRate: 2.4,
  ltv: 84000,
  changes: { mrr: 14.3, arr: 14.3, churnRate: -0.2, ltv: 8.1 },
}

describe('RevenueSummary', () => {
  it('renders MRR formatted as dollars from cents', () => {
    render(<RevenueSummary summary={summary} isLoading={false} />)
    expect(screen.getByText('$24,800')).toBeInTheDocument()
  })

  it('renders ARR', () => {
    render(<RevenueSummary summary={summary} isLoading={false} />)
    expect(screen.getByText('$297,600')).toBeInTheDocument()
  })

  it('churn rate shows %', () => {
    render(<RevenueSummary summary={summary} isLoading={false} />)
    expect(screen.getByText('2.4%')).toBeInTheDocument()
  })

  it('positive change shows ↑', () => {
    render(<RevenueSummary summary={summary} isLoading={false} />)
    expect(screen.getAllByText(/↑/).length).toBeGreaterThan(0)
  })

  it('negative churn rate change shows ↓', () => {
    const { container } = render(
      <RevenueSummary summary={summary} isLoading={false} />,
    )
    expect(container.textContent).toMatch(/↓/)
  })

  it('shows shimmer when isLoading', () => {
    const { container } = render(
      <RevenueSummary summary={undefined} isLoading />,
    )
    expect(container.querySelector('.shimmer')).toBeTruthy()
  })
})
