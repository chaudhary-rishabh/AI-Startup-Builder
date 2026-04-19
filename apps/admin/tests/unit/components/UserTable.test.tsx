import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserTable } from '@/components/users/UserTable'
import type { AdminUserRow, UserFilterParams } from '@/types'

const filters: UserFilterParams = {
  search: '',
  plan: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 25,
  sortBy: 'joinedAt',
  sortOrder: 'desc',
}

const users: AdminUserRow[] = [
  {
    id: 'u-1',
    name: 'Priya Sharma',
    email: 'priya@startup.io',
    avatarUrl: null,
    plan: 'pro',
    projectCount: 4,
    tokensUsedThisMonth: 1000,
    joinedAt: new Date().toISOString(),
    status: 'active',
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'u-2',
    name: 'Marcus Chen',
    email: 'marcus@idea.co',
    avatarUrl: null,
    plan: 'free',
    projectCount: 1,
    tokensUsedThisMonth: 100,
    joinedAt: new Date().toISOString(),
    status: 'suspended',
    lastActiveAt: null,
  },
]

vi.mock('@/lib/api/users.api', () => ({
  impersonateUser: vi.fn().mockResolvedValue({
    impersonateUrl: 'http://localhost/imp',
  }),
  suspendUser: vi.fn().mockResolvedValue(undefined),
  reactivateUser: vi.fn().mockResolvedValue(undefined),
  changeUserPlan: vi.fn().mockResolvedValue(undefined),
}))

describe('UserTable', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn())
  })

  function renderTable(
    props: Partial<React.ComponentProps<typeof UserTable>> = {},
  ) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const onFiltersChange = vi.fn()
    const onSelectionChange = vi.fn()
    const onRowClick = vi.fn()
    render(
      <QueryClientProvider client={qc}>
        <UserTable
          users={users}
          isLoading={false}
          filters={filters}
          onFiltersChange={onFiltersChange}
          total={2}
          totalPages={1}
          selectedIds={props.selectedIds ?? []}
          onSelectionChange={onSelectionChange}
          onRowClick={onRowClick}
          {...props}
        />
      </QueryClientProvider>,
    )
    return { onFiltersChange, onSelectionChange, onRowClick }
  }

  it('renders correct number of user rows', () => {
    renderTable()
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByText('Marcus Chen')).toBeInTheDocument()
  })

  it('shows shimmer rows when isLoading=true', () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <UserTable
          users={[]}
          isLoading
          filters={filters}
          onFiltersChange={vi.fn()}
          total={0}
          totalPages={1}
          selectedIds={[]}
          onSelectionChange={vi.fn()}
          onRowClick={vi.fn()}
          skeletonRows={5}
        />
      </QueryClientProvider>,
    )
    expect(document.querySelectorAll('.shimmer').length).toBeGreaterThan(0)
  })

  it('PlanBadge renders for each user', () => {
    renderTable()
    expect(document.body.textContent?.toUpperCase()).toMatch(/PRO/)
    expect(document.body.textContent?.toUpperCase()).toMatch(/FREE/)
  })

  it('StatusBadge renders for each user', () => {
    renderTable()
    expect(screen.getAllByText(/active/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/suspended/i).length).toBeGreaterThanOrEqual(1)
  })

  it('row click calls onRowClick with user data', () => {
    const { onRowClick } = renderTable()
    fireEvent.click(screen.getByText('Priya Sharma').closest('tr')!)
    expect(onRowClick).toHaveBeenCalled()
    expect(onRowClick.mock.calls[0][0].id).toBe('u-1')
  })

  it('selecting checkbox adds to selectedIds', () => {
    const onSelectionChange = vi.fn()
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <UserTable
          users={users}
          isLoading={false}
          filters={filters}
          onFiltersChange={vi.fn()}
          total={2}
          totalPages={1}
          selectedIds={[]}
          onSelectionChange={onSelectionChange}
          onRowClick={vi.fn()}
        />
      </QueryClientProvider>,
    )
    const boxes = screen.getAllByRole('checkbox')
    fireEvent.click(boxes[1]!)
    expect(onSelectionChange).toHaveBeenCalled()
  })

  it('pagination shows correct page info', () => {
    renderTable()
    expect(screen.getByText(/Showing/)).toBeInTheDocument()
  })
})
