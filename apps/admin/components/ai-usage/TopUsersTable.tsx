'use client'

import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AITopUser } from '@/types'
import { formatNumber } from '@/lib/dateRange'
import { throttleUser } from '@/lib/api/aiUsage.api'
import { DataTable } from '@/components/common/DataTable'
import { PlanBadge } from '@/components/common/PlanBadge'
import { ThrottleModal } from '@/components/ai-usage/ThrottleModal'

const col = createColumnHelper<AITopUser>()

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface TopUsersTableProps {
  users: AITopUser[]
  isLoading: boolean
}

export function TopUsersTable({ users, isLoading }: TopUsersTableProps) {
  const qc = useQueryClient()
  const [throttleUserRow, setThrottleUserRow] = useState<AITopUser | null>(null)

  const throttleMut = useMutation({
    mutationFn: ({
      userId,
      requestsPerMinute,
    }: {
      userId: string
      requestsPerMinute: number
    }) => throttleUser(userId, requestsPerMinute),
    onSuccess: () => {
      toast.success('Throttle updated')
      void qc.invalidateQueries({ queryKey: ['admin', 'ai-top-users'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const columns = useMemo(
    () => [
      col.display({
        id: 'user',
        header: () => 'User',
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
      col.accessor('plan', {
        header: () => 'Plan',
        cell: ({ getValue }) => <PlanBadge plan={getValue()} />,
      }),
      col.accessor('tokensThisMonth', {
        header: () => 'Tokens',
        cell: ({ getValue }) => formatNumber(getValue()),
      }),
      col.display({
        id: 'pct',
        header: () => '% of limit',
        cell: ({ row }) => {
          const p = row.original.percentOfLimit
          const color =
            p >= 100 ? 'bg-error' : p >= 80 ? 'bg-amber-500' : 'bg-teal-500'
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-divider">
                <div
                  className={`h-full ${color}`}
                  style={{ width: `${Math.min(100, p)}%` }}
                />
              </div>
              <span className="text-xs text-muted">{p.toFixed(1)}%</span>
            </div>
          )
        },
      }),
      col.display({
        id: 'overage',
        header: () => 'Projected overage',
        cell: ({ row }) =>
          row.original.projectedOverage > 0 ? (
            formatNumber(row.original.projectedOverage)
          ) : (
            <span className="text-muted">—</span>
          ),
      }),
      col.display({
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setThrottleUserRow(row.original)
            }}
            className="text-xs font-medium text-brand hover:underline"
          >
            Throttle
          </button>
        ),
      }),
    ],
    [],
  )

  return (
    <>
      <div className="rounded-card border border-divider bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-display text-sm font-semibold text-heading">
          Top users by usage
        </h3>
        <DataTable
          data={users}
          columns={columns}
          isLoading={isLoading}
          skeletonRows={5}
        />
      </div>
      <ThrottleModal
        open={!!throttleUserRow}
        onOpenChange={(o) => !o && setThrottleUserRow(null)}
        user={throttleUserRow}
        onConfirm={async (userId, requestsPerMinute) => {
          await throttleMut.mutateAsync({ userId, requestsPerMinute })
        }}
      />
    </>
  )
}
