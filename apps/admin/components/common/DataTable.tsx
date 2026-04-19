'use client'

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  isLoading?: boolean
  pagination?: {
    page: number
    pageSize: number
    totalPages: number
    total: number
    onPageChange: (page: number) => void
  }
  onRowClick?: (row: TData) => void
  selectedRowId?: string
  getRowId?: (row: TData) => string
  skeletonRows?: number
}

export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  pagination,
  onRowClick,
  selectedRowId,
  getRowId = (row) => (row as { id?: string }).id ?? String(row),
  skeletonRows = 10,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data: isLoading ? [] : data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getRowId(row),
  })

  const colCount = columns.length
  const pageSize = pagination?.pageSize ?? 25
  const start =
    pagination && pagination.total > 0
      ? (pagination.page - 1) * pageSize + 1
      : 0
  const end = pagination
    ? Math.min(pagination.page * pageSize, pagination.total)
    : 0

  const pageWindow = (() => {
    if (!pagination || pagination.totalPages <= 1) return []
    const { page, totalPages } = pagination
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
    <div className="bg-card rounded-card border border-divider overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-output">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="py-2 px-4 text-left text-[12px] font-medium uppercase tracking-wide text-muted"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, ri) => (
                  <tr key={ri} className="h-11">
                    {Array.from({ length: colCount }).map((__, ci) => (
                      <td key={ci} className="px-4 py-2">
                        <div className="h-4 rounded bg-divider shimmer" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row, index) => {
                  const id = getRowId(row.original)
                  const selected = selectedRowId === id
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onRowClick?.(row.original)}
                      className={cn(
                        'h-11 border-t border-divider/60',
                        index % 2 === 0 ? 'bg-card' : 'bg-output/40',
                        onRowClick && 'cursor-pointer hover:bg-divider/40',
                        selected &&
                          'bg-brand/5 border-l-2 border-l-brand border-t-divider/60',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="max-w-[280px] truncate px-4 text-sm text-heading"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-4 py-3 text-sm">
          <p className="text-muted">
            Showing {start}–{end} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-chip text-muted hover:bg-bg hover:text-heading disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageWindow.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => pagination.onPageChange(p)}
                className={cn(
                  'h-8 min-w-[32px] rounded-chip px-2 text-sm',
                  p === pagination.page
                    ? 'bg-brand font-medium text-white'
                    : 'text-muted hover:text-heading',
                )}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-chip text-muted hover:bg-bg hover:text-heading disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
