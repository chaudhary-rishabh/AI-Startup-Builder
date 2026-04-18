import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { useAdminAuthStore } from '@/store/adminAuthStore'

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
  useRouter: () => ({ replace: vi.fn() }),
}))

describe('AdminSidebar', () => {
  it('renders ADMIN red badge', () => {
    render(<AdminSidebar />)
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })

  it('renders all 8 nav items', () => {
    render(<AdminSidebar />)
    const labels = [
      'Dashboard',
      'Users',
      'Billing',
      'AI Usage',
      'Projects',
      'System',
      'Settings',
      'Audit Log',
    ]
    for (const l of labels) expect(screen.getByText(l)).toBeInTheDocument()
  })

  it('active nav item has left border indicator', () => {
    const { container } = render(<AdminSidebar />)
    const dashboardLink = container.querySelector(
      '[data-testid="nav-dashboard"]',
    )
    expect(dashboardLink?.className).toMatch(/bg-divider|font-medium/)
  })

  it('shows admin name and role', () => {
    useAdminAuthStore.getState().setAdmin({
      id: 'a1',
      email: 'a@test.com',
      name: 'Test Admin',
      role: 'super_admin',
      avatarUrl: null,
      lastLoginAt: null,
    })
    render(<AdminSidebar />)
    expect(screen.getByText('Test Admin')).toBeInTheDocument()
    expect(screen.getByText(/super admin/i)).toBeInTheDocument()
  })

  it('shows initials avatar when no avatarUrl', () => {
    useAdminAuthStore.getState().setAdmin({
      id: 'a1',
      email: 'a@test.com',
      name: 'John Doe',
      role: 'admin',
      avatarUrl: null,
      lastLoginAt: null,
    })
    render(<AdminSidebar />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })
})
