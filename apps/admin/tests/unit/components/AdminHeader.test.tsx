import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { DateRangeProvider } from '@/hooks/useDateRange'

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
}))

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(DateRangeProvider, null, children)

describe('AdminHeader', () => {
  it('shows correct page title for dashboard', () => {
    render(<AdminHeader />, { wrapper })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders 4 date preset buttons', () => {
    render(<AdminHeader />, { wrapper })
    expect(screen.getByTestId('date-preset-7d')).toBeInTheDocument()
    expect(screen.getByTestId('date-preset-30d')).toBeInTheDocument()
    expect(screen.getByTestId('date-preset-90d')).toBeInTheDocument()
    expect(screen.getByTestId('date-preset-1y')).toBeInTheDocument()
  })

  it('30d preset is active by default', () => {
    render(<AdminHeader />, { wrapper })
    const btn30d = screen.getByTestId('date-preset-30d')
    expect(btn30d.className).toContain('bg-white')
  })

  it('clicking 7d switches active preset', () => {
    render(<AdminHeader />, { wrapper })
    fireEvent.click(screen.getByTestId('date-preset-7d'))
    const btn7d = screen.getByTestId('date-preset-7d')
    expect(btn7d.className).toContain('bg-white')
  })

  it('Export button present', () => {
    render(<AdminHeader />, { wrapper })
    expect(screen.getByTestId('export-report-btn')).toBeInTheDocument()
  })
})
