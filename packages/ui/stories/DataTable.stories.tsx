import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '../src/components/custom/DataTable'
import { PlanBadge } from '../src/components/custom/PlanBadge'

// ── Mock data ─────────────────────────────────────────────────────────────────
type MockUser = {
  id: string
  name: string
  email: string
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: string
}

const mockUsers: MockUser[] = Array.from({ length: 20 }, (_, i) => ({
  id: `user-${i + 1}`,
  name: [
    'Alice Chen', 'Bob Sharma', 'Carol Davis', 'Dan Kim', 'Eva Patel',
    'Frank Liu', 'Grace Park', 'Hana Müller', 'Ivan Rossi', 'Julia Santos',
    'Kevin O\'Brien', 'Lena Fischer', 'Marco Russo', 'Nina Andersen', 'Omar Hassan',
    'Petra Novak', 'Quinn Walsh', 'Rosa López', 'Sam Taylor', 'Tara Singh',
  ][i] ?? `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  plan: (['free', 'pro', 'enterprise'] as const)[i % 3]!,
  createdAt: new Date(2024, 0, i + 1).toISOString().split('T')[0]!,
}))

// ── Column definitions ─────────────────────────────────────────────────────────
const columns: ColumnDef<MockUser>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="font-medium text-brand-dark">{row.getValue('name')}</span>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-brand-light">{row.getValue('email')}</span>
    ),
  },
  {
    accessorKey: 'plan',
    header: 'Plan',
    cell: ({ row }) => <PlanBadge plan={row.getValue('plan')} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Joined',
    cell: ({ row }) => (
      <span className="text-sm">{row.getValue('createdAt')}</span>
    ),
  },
]

// ── Meta ──────────────────────────────────────────────────────────────────────
const meta: Meta<typeof DataTable<MockUser>> = {
  title: 'Custom/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof DataTable<MockUser>>

export const Default: Story = {
  name: '20 Rows with Pagination',
  render: () => <DataTable data={mockUsers} columns={columns} />,
}

export const Loading: Story = {
  name: 'Loading Skeleton',
  render: () => (
    <DataTable
      data={[]}
      columns={columns}
      isLoading={true}
    />
  ),
}

export const Empty: Story = {
  name: 'Empty State',
  render: () => (
    <DataTable
      data={[]}
      columns={columns}
      emptyMessage="No users found. Try a different filter."
    />
  ),
}

export const ServerPagination: Story = {
  name: 'Server-side Pagination',
  render: () => {
    const [page, setPage] = React.useState(1)
    const pageSize = 5
    const start = (page - 1) * pageSize
    const pageData = mockUsers.slice(start, start + pageSize)

    return (
      <DataTable
        data={pageData}
        columns={columns}
        pagination={{ page, pageSize, total: mockUsers.length }}
        onPageChange={setPage}
      />
    )
  },
}
