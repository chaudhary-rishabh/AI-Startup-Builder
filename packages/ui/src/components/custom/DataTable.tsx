import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../shadcn/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../shadcn/table'
import { EmptyState } from './EmptyState'

const DEFAULT_PAGE_SIZE = 25

interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  pagination?: {
    page: number
    pageSize?: number
    total: number
  }
  onPageChange?: (page: number) => void
  isLoading?: boolean
  emptyMessage?: string
  className?: string
}

/**
 * Full-featured data table using TanStack Table v8.
 * Features: sortable columns, client or server pagination, loading skeleton, empty state.
 * Striped beige rows via table.tsx row styling.
 */
export function DataTable<TData>({
  data,
  columns,
  pagination,
  onPageChange,
  isLoading = false,
  emptyMessage = 'No results found.',
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const pageSize = pagination?.pageSize ?? DEFAULT_PAGE_SIZE
  const isServerPaginated = Boolean(pagination && onPageChange)

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      ...(isServerPaginated && {
        pagination: {
          pageIndex: (pagination?.page ?? 1) - 1,
          pageSize,
        },
      }),
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(isServerPaginated
      ? { manualPagination: true, pageCount: Math.ceil((pagination?.total ?? 0) / pageSize) }
      : { getPaginationRowModel: getPaginationRowModel() }),
  })

  const currentPage = isServerPaginated
    ? (pagination?.page ?? 1)
    : table.getState().pagination.pageIndex + 1

  const totalPages = isServerPaginated
    ? Math.ceil((pagination?.total ?? 0) / pageSize)
    : table.getPageCount()

  return (
    <div className={cn('space-y-3', className)}>
      {/* Table */}
      <div className="rounded-card border border-divider overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="odd:bg-white even:bg-white hover:bg-white">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  return (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cn(
                            'flex items-center gap-1 font-bold text-xs uppercase tracking-wider',
                            canSort
                              ? 'cursor-pointer select-none text-brand-light hover:text-brand-dark transition-colors'
                              : 'cursor-default text-brand-light',
                          )}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          disabled={!canSort}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span aria-hidden="true">
                              {sorted === 'asc' ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : sorted === 'desc' ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </span>
                          )}
                        </button>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded bg-divider animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState title="No results" description={emptyMessage} />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-brand-light">
            {isServerPaginated
              ? `${pagination?.total ?? 0} total rows`
              : `${table.getFilteredRowModel().rows.length} rows`}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isServerPaginated) {
                  onPageChange?.(currentPage - 1)
                } else {
                  table.previousPage()
                }
              }}
              disabled={currentPage <= 1 || isLoading}
            >
              Previous
            </Button>

            <span className="text-xs text-brand-dark font-medium">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isServerPaginated) {
                  onPageChange?.(currentPage + 1)
                } else {
                  table.nextPage()
                }
              }}
              disabled={currentPage >= totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
