import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import type { RevenueDataPoint } from '@/types'

const mockData: RevenueDataPoint[] = [
  { month: 'Jan 2025', mrr: 1800000, newMrr: 240000, churnedMrr: 42000 },
  { month: 'Feb 2025', mrr: 1920000, newMrr: 160000, churnedMrr: 40000 },
]

describe('RevenueChart', () => {
  it('renders card header', () => {
    render(<RevenueChart data={mockData} isLoading={false} />)
    expect(screen.getByText(/monthly recurring revenue/i)).toBeInTheDocument()
  })

  it('renders shimmer when loading', () => {
    const { container } = render(<RevenueChart data={[]} isLoading />)
    expect(container.querySelector('.shimmer')).toBeTruthy()
  })

  it('renders ResponsiveContainer when data present', () => {
    render(<RevenueChart data={mockData} isLoading={false} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })
})
