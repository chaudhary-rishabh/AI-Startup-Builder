import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KPIRow } from '@/components/dashboard/KPIRow'
import type { PlatformKPIs } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const mockKPIs: PlatformKPIs = {
  totalUsers: 12847,
  activeToday: 1204,
  newThisWeek: 312,
  totalProjects: 34521,
  totalRevenueCents: 2480000,
  avgSessionMinutes: 28,
  changes: {
    totalUsers: 8.4,
    activeToday: 12.1,
    newThisWeek: -3.2,
    totalProjects: 11.7,
    totalRevenue: 14.3,
    avgSession: 2.1,
  },
}

describe('KPIRow', () => {
  it('renders 6 KPI cards', () => {
    render(<KPIRow kpis={mockKPIs} isLoading={false} />)
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('Active Today')).toBeInTheDocument()
    expect(screen.getByText('New This Week')).toBeInTheDocument()
    expect(screen.getByText('Total Projects')).toBeInTheDocument()
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('Avg Session')).toBeInTheDocument()
  })

  it('formats revenue as dollars from cents', () => {
    render(<KPIRow kpis={mockKPIs} isLoading={false} />)
    expect(screen.getByText('$24,800')).toBeInTheDocument()
  })

  it('formats totalUsers with locale separators', () => {
    render(<KPIRow kpis={mockKPIs} isLoading={false} />)
    expect(screen.getByText('12,847')).toBeInTheDocument()
  })

  it('shows positive change badge with ↑', () => {
    render(<KPIRow kpis={mockKPIs} isLoading={false} />)
    expect(screen.getByText(/↑.*8\.4%/)).toBeInTheDocument()
  })

  it('shows negative change badge with ↓', () => {
    render(<KPIRow kpis={mockKPIs} isLoading={false} />)
    expect(screen.getByText(/↓.*3\.2%/)).toBeInTheDocument()
  })

  it('renders 6 shimmer cards when isLoading=true', () => {
    const { container } = render(<KPIRow kpis={undefined} isLoading />)
    const shimmers = container.querySelectorAll('.shimmer')
    expect(shimmers.length).toBeGreaterThanOrEqual(6)
  })

  it('avgSession formatted with m suffix', () => {
    render(<KPIRow kpis={mockKPIs} isLoading={false} />)
    expect(screen.getByText('28m')).toBeInTheDocument()
  })
})
