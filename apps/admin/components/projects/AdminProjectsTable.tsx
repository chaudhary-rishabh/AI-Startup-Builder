'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { AdminProject, AdminProjectFilterParams } from '@/types'
import { formatNumber } from '@/lib/dateRange'
import { DataTable } from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/cn'

const col = createColumnHelper<AdminProject>()

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const PHASE_STYLES: Record<number, string> = {
  1: 'bg-gray-100 text-gray-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-teal-100 text-teal-800',
  5: 'bg-green-100 text-green-800',
  6: 'bg-amber-100 text-amber-900',
}

function BuildModeChip({ mode }: { mode: AdminProject['buildMode'] }) {
  const styles =
    mode === 'autopilot'
      ? 'bg-purple-100 text-purple-700'
      : mode === 'copilot'
        ? 'bg-brand/10 text-brand'
        : 'bg-gray-100 text-gray-600'
  return (
    <span
      className={cn(
        'inline-block rounded-chip px-2 py-0.5 text-[10px] font-medium capitalize',
        styles,
      )}
    >
      {mode}
    </span>
  )
}

interface AdminProjectsTableProps {
  projects: AdminProject[]
  isLoading: boolean
  filters: AdminProjectFilterParams
  onFiltersChange: (f: Partial<AdminProjectFilterParams>) => void
  total: number
  totalPages: number
}

export function AdminProjectsTable({
  projects,
  isLoading,
  filters,
  onFiltersChange,
  total,
  totalPages,
}: AdminProjectsTableProps) {
  const router = useRouter()
  const [searchDraft, setSearchDraft] = useState(filters.search)

  useEffect(() => {
    setSearchDraft(filters.search)
  }, [filters.search])

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft !== filters.search) {
        onFiltersChange({ search: searchDraft, page: 1 })
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchDraft, filters.search, onFiltersChange])

  const columns = useMemo(
    () => [
      col.display({
        id: 'project',
        header: () => 'Project',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium">
              <span className="mr-1">{row.original.emoji}</span>
              {row.original.name}
            </p>
            <p className="font-mono text-[10px] text-muted">{row.original.id}</p>
          </div>
        ),
      }),
      col.display({
        id: 'owner',
        header: () => 'Owner',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
              {initials(row.original.userName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {row.original.userName}
              </p>
              <p className="truncate text-[12px] text-muted">
                {row.original.userEmail}
              </p>
            </div>
          </div>
        ),
      }),
      col.display({
        id: 'phase',
        header: () => 'Phase',
        cell: ({ row }) => {
          const ph = row.original.currentPhase
          return (
            <span
              className={cn(
                'inline-flex rounded-chip px-2 py-0.5 text-[11px] font-semibold',
                PHASE_STYLES[ph] ?? 'bg-gray-100 text-gray-700',
              )}
            >
              {ph}
            </span>
          )
        },
      }),
      col.accessor('status', {
        header: () => 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      col.accessor('buildMode', {
        header: () => 'Build mode',
        cell: ({ getValue }) => <BuildModeChip mode={getValue()} />,
      }),
      col.accessor('agentRunCount', {
        header: () => <span className="block text-right">Agent runs</span>,
        cell: ({ getValue }) => (
          <div className="text-right tabular-nums">{getValue()}</div>
        ),
      }),
      col.accessor('tokensUsed', {
        header: () => <span className="block text-right">Tokens</span>,
        cell: ({ getValue }) => (
          <div className="text-right tabular-nums">
            {formatNumber(getValue())}
          </div>
        ),
      }),
      col.accessor('lastActiveAt', {
        header: () => 'Last active',
        cell: ({ getValue }) => (
          <span className="text-[12px] text-muted">
            {formatDistanceToNow(new Date(getValue()), { addSuffix: true })}
          </span>
        ),
      }),
    ],
    [],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search name or owner email…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="h-9 w-[260px] rounded-card border border-divider py-1 pl-7 pr-2 text-sm"
          />
        </div>
        <select
          value={filters.phase === 'all' ? 'all' : String(filters.phase)}
          onChange={(e) => {
            const v = e.target.value
            onFiltersChange({
              phase: v === 'all' ? 'all' : Number(v),
              page: 1,
            })
          }}
          className="h-9 rounded-card border border-divider bg-white px-2 text-sm"
        >
          <option value="all">All phases</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              Phase {n}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) =>
            onFiltersChange({
              status: e.target.value as AdminProjectFilterParams['status'],
              page: 1,
            })
          }
          className="h-9 rounded-card border border-divider bg-white px-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="launched">Launched</option>
          <option value="deleted">Deleted</option>
        </select>
        <select
          value={filters.buildMode}
          onChange={(e) =>
            onFiltersChange({
              buildMode: e.target.value as AdminProjectFilterParams['buildMode'],
              page: 1,
            })
          }
          className="h-9 rounded-card border border-divider bg-white px-2 text-sm"
        >
          <option value="all">All build modes</option>
          <option value="autopilot">Autopilot</option>
          <option value="copilot">Copilot</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      <DataTable
        data={projects}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/admin/projects/${row.id}`)}
        getRowId={(row) => row.id}
        pagination={
          total > 0
            ? {
                page: filters.page,
                pageSize: filters.limit,
                totalPages,
                total,
                onPageChange: (page) => onFiltersChange({ page }),
              }
            : undefined
        }
      />
    </div>
  )
}
