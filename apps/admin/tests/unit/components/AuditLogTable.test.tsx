import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AuditLogTable } from '@/components/audit/AuditLogTable'
import type { AuditLogEntry } from '@/types'

vi.mock('@/lib/api/audit.api', () => ({
  exportAuditLog: vi.fn().mockResolvedValue(undefined),
}))

const logs: AuditLogEntry[] = [
  {
    id: 'aud-1',
    adminId: 'admin-1',
    adminEmail: 'admin@example.com',
    adminName: 'Super Admin',
    action: 'user.suspended',
    targetType: 'user',
    targetId: 'u-2',
    targetLabel: 'marcus@idea.co',
    beforeState: { status: 'active' },
    afterState: { status: 'suspended' },
    ipAddress: '203.0.113.1',
    userAgent: 'Mozilla Chrome/120',
    createdAt: new Date().toISOString(),
  },
]

describe('AuditLogTable', () => {
  const noop = () => {}

  it('renders audit log rows with action chips', () => {
    render(
      <AuditLogTable
        logs={logs}
        total={1}
        totalPages={1}
        page={1}
        pageSize={25}
        isLoading={false}
        filters={{}}
        onFiltersChange={noop}
      />,
    )
    const table = screen.getByRole('table')
    expect(within(table).getByText('user.suspended')).toBeInTheDocument()
  })

  it('"user.suspended" action chip visible', () => {
    render(
      <AuditLogTable
        logs={logs}
        total={1}
        totalPages={1}
        page={1}
        pageSize={25}
        isLoading={false}
        filters={{}}
        onFiltersChange={noop}
      />,
    )
    expect(within(screen.getByRole('table')).getByText('user.suspended')).toBeVisible()
  })

  it('before→after change rendered for non-null states', () => {
    render(
      <AuditLogTable
        logs={logs}
        total={1}
        totalPages={1}
        page={1}
        pageSize={25}
        isLoading={false}
        filters={{}}
        onFiltersChange={noop}
      />,
    )
    expect(within(screen.getByRole('table')).getByText(/status:/)).toBeInTheDocument()
  })

  it('Export CSV button present', () => {
    render(
      <AuditLogTable
        logs={logs}
        total={1}
        totalPages={1}
        page={1}
        pageSize={25}
        isLoading={false}
        filters={{}}
        onFiltersChange={noop}
      />,
    )
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument()
  })

  it('immutable banner displayed above table', () => {
    render(
      <AuditLogTable
        logs={logs}
        total={1}
        totalPages={1}
        page={1}
        pageSize={25}
        isLoading={false}
        filters={{}}
        onFiltersChange={noop}
      />,
    )
    expect(screen.getByTestId('audit-immutable-banner')).toBeInTheDocument()
  })

  it('admin email shown in each row', () => {
    render(
      <AuditLogTable
        logs={logs}
        total={1}
        totalPages={1}
        page={1}
        pageSize={25}
        isLoading={false}
        filters={{}}
        onFiltersChange={noop}
      />,
    )
    expect(screen.getAllByText('admin@example.com').length).toBeGreaterThanOrEqual(
      1,
    )
  })
})
