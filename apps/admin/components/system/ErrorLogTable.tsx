'use client'

import { Fragment, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ErrorLogEntry } from '@/types'
import { cn } from '@/lib/cn'
import { useAdminAuthStore } from '@/store/adminAuthStore'

interface ErrorLogTableProps {
  errors: ErrorLogEntry[]
  total: number
  isLoading: boolean
  severity: string
  onSeverityChange: (v: string) => void
  page: number
  onPageChange: (p: number) => void
}

export function ErrorLogTable({
  errors,
  total,
  isLoading,
  severity,
  onSeverityChange,
  page,
  onPageChange,
}: ErrorLogTableProps) {
  const role = useAdminAuthStore((s) => s.admin?.role)
  const isSuper = role === 'super_admin'
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total > 0 ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, total)

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pageWindow = (() => {
    if (totalPages <= 1) return []
    const windowSize = 5
    let startPage = Math.max(1, page - Math.floor(windowSize / 2))
    let endPage = Math.min(totalPages, startPage + windowSize - 1)
    if (endPage - startPage < windowSize - 1) {
      startPage = Math.max(1, endPage - windowSize + 1)
    }
    const out: number[] = []
    for (let i = startPage; i <= endPage; i += 1) out.push(i)
    return out
  })()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted">Severity</span>
        <select
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value)}
          className="h-9 rounded-card border border-divider bg-white px-2 text-sm"
        >
          <option value="all">All</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-card border border-divider bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-output">
                {['Severity', 'Time', 'Type', 'Endpoint', 'User', 'Message'].map(
                  (h) => (
                    <th
                      key={h}
                      className="py-2 px-4 text-left text-[12px] font-medium uppercase tracking-wide text-muted"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, ri) => (
                    <tr key={ri} className="h-11">
                      {Array.from({ length: 6 }).map((__, ci) => (
                        <td key={ci} className="px-4 py-2">
                          <div className="h-4 rounded bg-divider shimmer" />
                        </td>
                      ))}
                    </tr>
                  ))
                : errors.map((row, index) => (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => toggle(row.id)}
                        className={cn(
                          'h-11 cursor-pointer border-t border-divider/60 hover:bg-divider/40',
                          index % 2 === 0 ? 'bg-card' : 'bg-output/40',
                        )}
                      >
                        <td className="px-4">
                          <SeverityPill severity={row.severity} />
                        </td>
                        <td className="px-4 font-mono text-[12px] text-muted">
                          {formatDistanceToNow(new Date(row.occurredAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="max-w-[120px] truncate px-4">
                          <span className="rounded-chip bg-output px-2 py-0.5 font-mono text-[11px]">
                            {row.type}
                          </span>
                        </td>
                        <td className="max-w-[140px] truncate px-4 font-mono text-[12px]">
                          {row.endpoint}
                        </td>
                        <td className="px-4 text-[12px] text-muted">
                          {row.userEmail ?? 'anonymous'}
                        </td>
                        <td className="max-w-[220px] truncate px-4 text-[13px] text-heading">
                          {row.message.length > 80
                            ? `${row.message.slice(0, 80)}…`
                            : row.message}
                        </td>
                      </tr>
                      {expanded.has(row.id) && (
                        <tr key={`${row.id}-exp`} className="bg-output/90">
                          <td colSpan={6} className="px-4 py-3">
                            <p className="text-[13px] text-heading">
                              {row.message}
                            </p>
                            {row.stack && (
                              <pre className="mt-2 max-h-[200px] overflow-auto rounded bg-output p-3 font-mono text-[11px] text-heading">
                                {row.stack}
                              </pre>
                            )}
                            {isSuper && row.userEmailUnmasked && (
                              <p className="mt-2 text-xs text-muted">
                                Affected user (unmasked):{' '}
                                <span className="font-mono text-heading">
                                  {row.userEmailUnmasked}
                                </span>
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-4 py-3 text-sm">
            <p className="text-muted">
              Showing {start}–{end} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-chip text-muted hover:bg-bg hover:text-heading disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageWindow.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'h-8 min-w-[32px] rounded-chip px-2 text-sm',
                    p === page
                      ? 'bg-brand font-medium text-white'
                      : 'text-muted hover:text-heading',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-chip text-muted hover:bg-bg hover:text-heading disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SeverityPill({
  severity,
}: {
  severity: ErrorLogEntry['severity']
}) {
  const cls =
    severity === 'critical'
      ? 'bg-red-100 font-bold text-error'
      : severity === 'error'
        ? 'bg-red-50 text-error'
        : 'bg-amber-50 text-warning'
  return (
    <span
      className={cn(
        'inline-block rounded-chip px-2 py-0.5 text-[11px] capitalize',
        cls,
      )}
    >
      {severity}
    </span>
  )
}
