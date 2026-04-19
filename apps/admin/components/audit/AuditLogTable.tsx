'use client'

import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import type { AuditLogEntry, AuditLogFilter } from '@/types'
import { exportAuditLog } from '@/lib/api/audit.api'
import { DataTable } from '@/components/common/DataTable'

const col = createColumnHelper<AuditLogEntry>()

const KNOWN_ACTIONS = [
  'user.suspended',
  'user.reactivated',
  'plan.changed',
  'refund.issued',
  'coupon.created',
  'coupon.deleted',
  'feature_flag.updated',
]

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function summarizeChange(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): string | null {
  if (!before || !after) return null
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const parts: string[] = []
  keys.forEach((k) => {
    if (before[k] !== after[k]) {
      parts.push(`${k}: ${fmtVal(before[k])} → ${fmtVal(after[k])}`)
    }
  })
  if (parts.length === 0) return null
  const s = parts.join('; ')
  return s.length > 60 ? `${s.slice(0, 60)}…` : s
}

interface AuditLogTableProps {
  logs: AuditLogEntry[]
  total: number
  totalPages: number
  page: number
  pageSize: number
  isLoading: boolean
  filters: Partial<AuditLogFilter>
  onFiltersChange: (f: Partial<AuditLogFilter>) => void
}

export function AuditLogTable({
  logs,
  total,
  totalPages,
  page,
  pageSize,
  isLoading,
  filters,
  onFiltersChange,
}: AuditLogTableProps) {
  const [exporting, setExporting] = useState(false)

  const adminOptions = useMemo(() => {
    const m = new Map<string, { id: string; email: string }>()
    logs.forEach((l) =>
      m.set(l.adminId, { id: l.adminId, email: l.adminEmail }),
    )
    return [...m.values()]
  }, [logs])

  const columns = useMemo(
    () => [
      col.accessor('createdAt', {
        header: () => 'Time',
        cell: ({ getValue }) => {
          const iso = getValue() as string
          return (
            <div>
              <p
                className="font-mono text-[13px] text-heading"
                title={iso}
              >
                {iso}
              </p>
              <p className="text-[11px] text-muted">
                {formatDistanceToNow(new Date(iso), { addSuffix: true })}
              </p>
            </div>
          )
        },
      }),
      col.display({
        id: 'admin',
        header: () => 'Admin',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
              {row.original.adminName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <span className="text-[12px]">{row.original.adminEmail}</span>
          </div>
        ),
      }),
      col.accessor('action', {
        header: () => 'Action',
        cell: ({ getValue }) => (
          <span className="rounded-chip bg-output font-mono text-[12px] text-heading">
            {getValue()}
          </span>
        ),
      }),
      col.display({
        id: 'target',
        header: () => 'Target',
        cell: ({ row }) => (
          <div>
            <span className="rounded-chip bg-divider/60 px-2 py-0.5 text-[12px]">
              {row.original.targetType}
            </span>
            <p className="mt-1 text-[13px] font-medium text-heading">
              {row.original.targetLabel}
            </p>
          </div>
        ),
      }),
      col.display({
        id: 'change',
        header: () => 'Change',
        cell: ({ row }) => {
          const s = summarizeChange(row.original.beforeState, row.original.afterState)
          return s ? (
            <span className="text-[12px] text-heading">{s}</span>
          ) : (
            <span className="text-muted">—</span>
          )
        },
      }),
      col.accessor('ipAddress', {
        header: () => 'IP',
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-muted">{getValue()}</span>
        ),
      }),
    ],
    [],
  )

  const exportCsv = async () => {
    setExporting(true)
    try {
      await exportAuditLog(filters)
      toast.success('Export started')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning"
        data-testid="audit-immutable-banner"
      >
        Audit logs are immutable and cannot be edited or deleted.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.adminId ?? 'all'}
          onChange={(e) =>
            onFiltersChange({
              adminId: e.target.value as AuditLogFilter['adminId'],
              page: 1,
            })
          }
          className="h-9 rounded-card border border-divider bg-white px-2 text-sm"
        >
          <option value="all">All admins</option>
          {adminOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.email}
            </option>
          ))}
        </select>
        <select
          value={filters.action ?? 'all'}
          onChange={(e) =>
            onFiltersChange({
              action: e.target.value as AuditLogFilter['action'],
              page: 1,
            })
          }
          className="h-9 max-w-[200px] rounded-card border border-divider bg-white px-2 text-sm"
        >
          <option value="all">All actions</option>
          {KNOWN_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-muted">
          From
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(e) =>
              onFiltersChange({ from: e.target.value, page: 1 })
            }
            className="h-9 rounded-card border border-divider px-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted">
          To
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => onFiltersChange({ to: e.target.value, page: 1 })}
            className="h-9 rounded-card border border-divider px-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={exporting}
          onClick={() => void exportCsv()}
          className="ml-auto inline-flex items-center gap-1 rounded-card border border-divider bg-white px-3 py-1.5 text-xs font-medium hover:bg-bg"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {!isLoading && logs.length === 0 ? (
        <p className="text-sm text-muted">
          No audit events found for this filter.
        </p>
      ) : (
        <DataTable
          data={logs}
          columns={columns}
          isLoading={isLoading}
          pagination={
            total > 0
              ? {
                  page,
                  pageSize,
                  totalPages,
                  total,
                  onPageChange: (p) => onFiltersChange({ page: p }),
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
