import { render, screen } from '@testing-library/react'
import { AdminProjectsTable } from '@/components/projects/AdminProjectsTable'
import type { AdminProject, AdminProjectFilterParams } from '@/types'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/projects',
}))

const mockProjects: AdminProject[] = [
  {
    id: 'proj-1',
    name: 'RestaurantIQ',
    emoji: '🍽️',
    userId: 'u-1',
    userName: 'Priya Sharma',
    userEmail: 'priya@startup.io',
    currentPhase: 4,
    status: 'active',
    buildMode: 'copilot',
    agentRunCount: 47,
    tokensUsed: 284000,
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    name: 'HealthAI Coach',
    emoji: '🏥',
    userId: 'u-3',
    userName: "Sarah O'Brien",
    userEmail: 'sarah@builder.xyz',
    currentPhase: 6,
    status: 'launched',
    buildMode: 'autopilot',
    agentRunCount: 120,
    tokensUsed: 890000,
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
]

const filters: AdminProjectFilterParams = {
  search: '',
  phase: 'all',
  status: 'all',
  buildMode: 'all',
  page: 1,
  limit: 25,
  sortBy: 'lastActiveAt',
  sortOrder: 'desc',
}

describe('AdminProjectsTable', () => {
  it('renders project rows from data', () => {
    render(
      <AdminProjectsTable
        projects={mockProjects}
        isLoading={false}
        filters={filters}
        onFiltersChange={vi.fn()}
        total={2}
        totalPages={1}
      />,
    )
    expect(screen.getByText('RestaurantIQ')).toBeInTheDocument()
    expect(screen.getByText('HealthAI Coach')).toBeInTheDocument()
  })

  it('shows phase badge with correct phase number', () => {
    render(
      <AdminProjectsTable
        projects={mockProjects}
        isLoading={false}
        filters={filters}
        onFiltersChange={vi.fn()}
        total={2}
        totalPages={1}
      />,
    )
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('"launched" status shows purple badge', () => {
    render(
      <AdminProjectsTable
        projects={mockProjects}
        isLoading={false}
        filters={filters}
        onFiltersChange={vi.fn()}
        total={2}
        totalPages={1}
      />,
    )
    const launchedBadge = screen.getAllByText('launched').find((el) =>
      el.className.includes('purple'),
    )
    expect(launchedBadge).toBeDefined()
  })

  it('filter bar: search input present', () => {
    render(
      <AdminProjectsTable
        projects={[]}
        isLoading={false}
        filters={filters}
        onFiltersChange={vi.fn()}
        total={0}
        totalPages={1}
      />,
    )
    expect(
      screen.getByPlaceholderText(/search name or owner email/i),
    ).toBeInTheDocument()
  })
})
