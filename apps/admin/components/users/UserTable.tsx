'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import * as Checkbox from '@radix-ui/react-checkbox'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowDown, ArrowUp, Check, MoreHorizontal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { AdminUserRow, UserFilterParams, UserPlan } from '@/types'
import { formatNumber } from '@/lib/dateRange'
import { cn } from '@/lib/cn'
import { PlanBadge } from '@/components/common/PlanBadge'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  changeUserPlan,
  impersonateUser,
  reactivateUser,
  suspendUser,
} from '@/lib/api/users.api'
import { ChangePlanModal } from '@/components/users/ChangePlanModal'
import { SuspendUserModal } from '@/components/users/SuspendUserModal'

const columnHelper = createColumnHelper<AdminUserRow>()

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface UserTableProps {
  users: AdminUserRow[]
  isLoading: boolean
  filters: UserFilterParams
  onFiltersChange: (f: Partial<UserFilterParams>) => void
  total: number
  totalPages: number
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onRowClick: (user: AdminUserRow) => void
  selectedRowId?: string
}

export function UserTable({
  users,
  isLoading,
  filters,
  onFiltersChange,
  total,
  totalPages,
  selectedIds,
  onSelectionChange,
  onRowClick,
  selectedRowId,
}: UserTableProps) {
  const queryClient = useQueryClient()
  const [planModalUser, setPlanModalUser] = useState<AdminUserRow | null>(null)
  const [suspendUserRow, setSuspendUserRow] = useState<AdminUserRow | null>(
    null,
  )
  const [bulkSuspendOpen, setBulkSuspendOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  const toggleSort = (key: UserFilterParams['sortBy']) => {
    const nextOrder =
      filters.sortBy === key && filters.sortOrder === 'asc' ? 'desc' : 'asc'
    onFiltersChange({ sortBy: key, sortOrder: nextOrder, page: 1 })
  }

  const SortIcon = ({ column }: { column: UserFilterParams['sortBy'] }) => {
    if (filters.sortBy !== column) return null
    return filters.sortOrder === 'asc' ? (
      <ArrowUp className="inline h-2.5 w-2.5 text-brand" />
    ) : (
      <ArrowDown className="inline h-2.5 w-2.5 text-brand" />
    )
  }

  const allPageSelected =
    users.length > 0 && users.every((u) => selectedIds.includes(u.id))
  const somePageSelected = users.some((u) => selectedIds.includes(u.id))

  const toggleRow = (id: string, checked: boolean) => {
    if (checked) onSelectionChange([...new Set([...selectedIds, id])])
    else onSelectionChange(selectedIds.filter((x) => x !== id))
  }

  const toggleAllPage = (checked: boolean) => {
    if (checked) {
      const ids = new Set(selectedIds)
      users.forEach((u) => ids.add(u.id))
      onSelectionChange([...ids])
    } else {
      const pageIds = new Set(users.map((u) => u.id))
      onSelectionChange(selectedIds.filter((id) => !pageIds.has(id)))
    }
  }

  const handleImpersonate = async (userId: string) => {
    try {
      const { impersonateUrl } = await impersonateUser(userId)
      window.open(impersonateUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impersonation failed')
    }
  }

  const columns = useMemo(
    () =>
      [
        columnHelper.display({
          id: 'select',
          header: () => (
            <Checkbox.Root
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded border border-divider bg-white',
                somePageSelected && !allPageSelected && 'bg-brand/20',
              )}
              checked={
                allPageSelected
                  ? true
                  : somePageSelected
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={(v) => toggleAllPage(!!v)}
            >
              <Checkbox.Indicator>
                <Check className="h-3 w-3 text-brand" />
              </Checkbox.Indicator>
            </Checkbox.Root>
          ),
          cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox.Root
                className="flex h-4 w-4 items-center justify-center rounded border border-divider bg-white"
                checked={selectedIds.includes(row.original.id)}
                onCheckedChange={(v) =>
                  toggleRow(row.original.id, v === true)
                }
              >
                <Checkbox.Indicator>
                  <Check className="h-3 w-3 text-brand" />
                </Checkbox.Indicator>
              </Checkbox.Root>
            </div>
          ),
          size: 40,
        }),
        columnHelper.accessor('name', {
          header: () => (
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-heading"
              onClick={() => toggleSort('name')}
            >
              User <SortIcon column="name" />
            </button>
          ),
          cell: ({ row }) => {
            const u = row.original
            return (
              <div className="flex items-center gap-2">
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                    {initials(u.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{u.name}</p>
                  <p className="truncate text-[12px] text-muted">{u.email}</p>
                </div>
              </div>
            )
          },
        }),
        columnHelper.accessor('plan', {
          header: () => <span>Plan</span>,
          cell: ({ getValue }) => (
            <PlanBadge plan={getValue() as UserPlan} />
          ),
        }),
        columnHelper.accessor('projectCount', {
          header: () => (
            <button
              type="button"
              className="inline-flex w-full cursor-pointer justify-end gap-1 uppercase hover:text-heading"
              onClick={() => toggleSort('projectCount')}
            >
              Projects# <SortIcon column="projectCount" />
            </button>
          ),
          cell: ({ getValue }) => (
            <div className="text-right tabular-nums">{getValue()}</div>
          ),
        }),
        columnHelper.accessor('tokensUsedThisMonth', {
          header: () => (
            <button
              type="button"
              className="inline-flex w-full cursor-pointer justify-end gap-1 uppercase hover:text-heading"
              onClick={() => toggleSort('tokensUsed')}
            >
              Tokens <SortIcon column="tokensUsed" />
            </button>
          ),
          cell: ({ getValue }) => (
            <div className="text-right text-sm">
              {formatNumber(getValue())}
              <span className="text-[12px] text-muted"> T</span>
            </div>
          ),
        }),
        columnHelper.accessor('joinedAt', {
          header: () => (
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-heading"
              onClick={() => toggleSort('joinedAt')}
            >
              Joined <SortIcon column="joinedAt" />
            </button>
          ),
          cell: ({ getValue }) => (
            <span className="text-[12px] text-muted">
              {formatDistanceToNow(new Date(getValue()), { addSuffix: true })}
            </span>
          ),
        }),
        columnHelper.accessor('status', {
          header: () => <span>Status</span>,
          cell: ({ getValue }) => <StatusBadge status={getValue()} />,
        }),
        columnHelper.display({
          id: 'actions',
          header: () => null,
          cell: ({ row }) => {
            const u = row.original
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="rounded-chip p-1 text-muted hover:bg-bg hover:text-heading"
                      aria-label="Actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="z-50 min-w-[180px] rounded-card border border-divider bg-white p-1 shadow-md"
                      sideOffset={4}
                    >
                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="block cursor-pointer rounded-chip px-3 py-2 text-sm outline-none data-[highlighted]:bg-bg"
                        >
                          View profile
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="cursor-pointer rounded-chip px-3 py-2 text-sm outline-none data-[highlighted]:bg-bg"
                        onSelect={() => void handleImpersonate(u.id)}
                      >
                        Impersonate
                      </DropdownMenu.Item>
                      {u.status === 'suspended' ? (
                        <DropdownMenu.Item
                          className="cursor-pointer rounded-chip px-3 py-2 text-sm text-success outline-none data-[highlighted]:bg-bg"
                          onSelect={async () => {
                            try {
                              await reactivateUser(u.id)
                              toast.success('User reactivated')
                              void queryClient.invalidateQueries({
                                queryKey: ['admin', 'users'],
                              })
                            } catch (e) {
                              toast.error(
                                e instanceof Error
                                  ? e.message
                                  : 'Reactivate failed',
                              )
                            }
                          }}
                        >
                          Reactivate
                        </DropdownMenu.Item>
                      ) : (
                        <DropdownMenu.Item
                          className="cursor-pointer rounded-chip px-3 py-2 text-sm text-error outline-none data-[highlighted]:bg-bg"
                          onSelect={() => setSuspendUserRow(u)}
                        >
                          Suspend
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Item
                        className="cursor-pointer rounded-chip px-3 py-2 text-sm outline-none data-[highlighted]:bg-bg"
                        onSelect={() => setPlanModalUser(u)}
                      >
                        Change plan
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            )
          },
        }),
      ] as ColumnDef<AdminUserRow>[],
    [
      filters.sortBy,
      filters.sortOrder,
      selectedIds,
      users,
      allPageSelected,
      somePageSelected,
    ],
  )

  const table = useReactTable({
    data: isLoading ? [] : users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  const pageWindow = useMemo(() => {
    if (totalPages <= 1) return []
    const windowSize = 5
    let startPage = Math.max(1, filters.page - Math.floor(windowSize / 2))
    let endPage = Math.min(totalPages, startPage + windowSize - 1)
    if (endPage - startPage < windowSize - 1) {
      startPage = Math.max(1, endPage - windowSize + 1)
    }
    const out: number[] = []
    for (let i = startPage; i <= endPage; i += 1) out.push(i)
    return out
  }, [filters.page, totalPages])

  return (
    <>
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
                      style={{ width: header.getSize() }}
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
                ? Array.from({ length: 10 }).map((_, ri) => (
                    <tr key={ri} className="h-11">
                      {columns.map((_, ci) => (
                        <td key={ci} className="px-4 py-2">
                          <div className="h-4 rounded bg-divider shimmer" />
                        </td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.map((row, index) => {
                    const u = row.original
                    const selected = selectedRowId === u.id
                    return (
                      <tr
                        key={row.id}
                        onClick={() => onRowClick(u)}
                        className={cn(
                          'h-11 border-t border-divider/60',
                          index % 2 === 0 ? 'bg-card' : 'bg-output/40',
                          'cursor-pointer hover:bg-divider/40',
                          selected &&
                            'bg-brand/5 border-l-2 border-l-brand border-t-divider/60',
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="max-w-[320px] truncate px-4 text-sm text-heading"
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

        {!isLoading && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-4 py-3 text-sm">
            <p className="text-muted">
              Showing {(filters.page - 1) * filters.limit + 1}–
              {Math.min(filters.page * filters.limit, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() =>
                  onFiltersChange({ page: filters.page - 1 })
                }
                className="h-8 rounded-chip px-2 text-muted hover:bg-bg disabled:opacity-40"
              >
                Prev
              </button>
              {pageWindow.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onFiltersChange({ page: p })}
                  className={cn(
                    'h-8 min-w-[32px] rounded-chip px-2 text-sm',
                    p === filters.page
                      ? 'bg-brand font-medium text-white'
                      : 'text-muted hover:text-heading',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={filters.page >= totalPages}
                onClick={() =>
                  onFiltersChange({ page: filters.page + 1 })
                }
                className="h-8 rounded-chip px-2 text-muted hover:bg-bg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ChangePlanModal
        open={!!planModalUser}
        onOpenChange={(v) => !v && setPlanModalUser(null)}
        currentPlan={planModalUser?.plan ?? 'pro'}
        onConfirm={async (plan, note) => {
          if (!planModalUser) return
          await changeUserPlan(planModalUser.id, plan, note)
          toast.success('Plan updated')
          setPlanModalUser(null)
          void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
          void queryClient.invalidateQueries({
            queryKey: ['admin', 'user', planModalUser.id],
          })
        }}
      />

      <SuspendUserModal
        open={!!suspendUserRow}
        onOpenChange={(v) => !v && setSuspendUserRow(null)}
        onConfirm={async (reason) => {
          if (!suspendUserRow) return
          await suspendUser(suspendUserRow.id, reason)
          toast.success('User suspended')
          setSuspendUserRow(null)
          void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
        }}
      />
    </>
  )
}
