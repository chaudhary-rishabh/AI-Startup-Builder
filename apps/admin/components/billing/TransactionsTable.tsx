'use client'

import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminTransaction } from '@/types'
import { formatCents } from '@/lib/dateRange'
import { exportTransactions, issueRefund, listTransactions } from '@/lib/api/billing.api'
import { DataTable } from '@/components/common/DataTable'
import { PlanBadge } from '@/components/common/PlanBadge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { RefundModal } from '@/components/billing/RefundModal'

const col = createColumnHelper<AdminTransaction>()

export function TransactionsTable() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refundTx, setRefundTx] = useState<AdminTransaction | null>(null)

  const txQuery = useQuery({
    queryKey: ['admin', 'transactions', statusFilter, search, page],
    queryFn: () =>
      listTransactions({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 10,
      }),
  })

  const rows = useMemo(() => {
    const t = txQuery.data?.transactions ?? []
    if (!search.trim()) return t
    const q = search.toLowerCase()
    return t.filter(
      (x) =>
        x.userName.toLowerCase().includes(q) ||
        x.userEmail.toLowerCase().includes(q),
    )
  }, [txQuery.data?.transactions, search])

  const columns = useMemo(
    () => [
      col.display({
        id: 'user',
        header: () => 'User',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium">{row.original.userName}</p>
            <p className="text-[12px] text-muted">{row.original.userEmail}</p>
          </div>
        ),
      }),
      col.accessor('amountCents', {
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ getValue, row }) => (
          <div
            className={`text-right font-medium ${
              row.original.status === 'failed' ? 'text-error' : 'text-success'
            }`}
          >
            {formatCents(getValue())}
          </div>
        ),
      }),
      col.accessor('plan', {
        header: () => 'Plan',
        cell: ({ getValue }) => <PlanBadge plan={getValue()} />,
      }),
      col.accessor('createdAt', {
        header: () => 'Date',
        cell: ({ getValue }) => (
          <span className="text-[12px] text-muted">
            {formatDistanceToNow(new Date(getValue()), { addSuffix: true })}
          </span>
        ),
      }),
      col.accessor('status', {
        header: () => 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      col.display({
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const t = row.original
          const canRefund =
            t.status === 'succeeded' && t.refundedAmountCents < t.amountCents
          if (!canRefund) return null
          return (
            <button
              type="button"
              onClick={() => setRefundTx(t)}
              className="text-xs font-medium text-brand hover:underline"
            >
              Refund
            </button>
          )
        },
      }),
    ],
    [],
  )

  const data = txQuery.data

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="h-9 rounded-card border border-divider bg-white px-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="pending">Pending</option>
          </select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search by user name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-[220px] rounded-card border border-divider py-1 pl-7 pr-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void exportTransactions()}
          className="inline-flex items-center gap-1 rounded-card border border-divider bg-white px-3 py-1.5 text-xs font-medium hover:bg-bg"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        isLoading={txQuery.isLoading}
        pagination={
          data
            ? {
                page,
                pageSize: 10,
                totalPages: data.totalPages,
                total: data.total,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      <RefundModal
        open={!!refundTx}
        onOpenChange={(v) => !v && setRefundTx(null)}
        transaction={refundTx}
        onConfirm={async (amountCents, reason) => {
          if (!refundTx) return
          await issueRefund(refundTx.id, amountCents, reason)
          toast.success('Refund issued')
          await qc.invalidateQueries({ queryKey: ['admin', 'transactions'] })
        }}
      />
    </div>
  )
}
