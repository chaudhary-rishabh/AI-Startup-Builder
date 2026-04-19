'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Tabs from '@radix-ui/react-tabs'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  changeUserPlan,
  getUserDetail,
  getUserInvoices,
  getUserLoginHistory,
  getUserProjects,
  impersonateUser,
  reactivateUser,
  suspendUser,
  updateUserNotes,
} from '@/lib/api/users.api'
import type { AdminUserInvoice, AdminUserLoginEvent, AdminUserProject } from '@/types'
import { formatCents, formatNumber } from '@/lib/dateRange'
import { PlanBadge } from '@/components/common/PlanBadge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable } from '@/components/common/DataTable'
import { ChangePlanModal } from '@/components/users/ChangePlanModal'
import { SuspendUserModal } from '@/components/users/SuspendUserModal'

const projCol = createColumnHelper<AdminUserProject>()
const invCol = createColumnHelper<AdminUserInvoice>()
const loginCol = createColumnHelper<AdminUserLoginEvent>()

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params['id'] === 'string' ? params['id'] : ''
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')
  const [planOpen, setPlanOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)

  const detailQuery = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => getUserDetail(id),
    enabled: !!id,
  })

  const projectsQuery = useQuery({
    queryKey: ['admin', 'user-projects', id],
    queryFn: () => getUserProjects(id),
    enabled: !!id,
  })

  const invoicesQuery = useQuery({
    queryKey: ['admin', 'user-invoices', id],
    queryFn: () => getUserInvoices(id),
    enabled: !!id,
  })

  const loginQuery = useQuery({
    queryKey: ['admin', 'user-login', id],
    queryFn: () => getUserLoginHistory(id),
    enabled: !!id,
  })

  const u = detailQuery.data

  useEffect(() => {
    if (u) setNotes(u.adminNotes ?? '')
  }, [u])

  const handleNotesBlur = async () => {
    if (!id) return
    try {
      await updateUserNotes(id, notes)
      toast.success('Notes saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const projectColumns = [
    projCol.display({
      id: 'name',
      header: () => 'Project',
      cell: ({ row }) => (
        <span>
          {row.original.emoji} {row.original.name}
        </span>
      ),
    }),
    projCol.accessor('currentPhase', { header: () => 'Phase' }),
    projCol.accessor('status', {
      header: () => 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    }),
    projCol.accessor('buildMode', { header: () => 'Build mode' }),
    projCol.accessor('lastActiveAt', {
      header: () => 'Last active',
      cell: ({ getValue }) =>
        formatDistanceToNow(new Date(getValue()), { addSuffix: true }),
    }),
  ]

  const invoiceColumns = [
    invCol.accessor('createdAt', {
      header: () => 'Date',
      cell: ({ getValue }) =>
        formatDistanceToNow(new Date(getValue()), { addSuffix: true }),
    }),
    invCol.accessor('amountCents', {
      header: () => 'Amount',
      cell: ({ getValue }) => formatCents(getValue()),
    }),
    invCol.accessor('plan', {
      header: () => 'Plan',
      cell: ({ getValue }) => <PlanBadge plan={getValue()} />,
    }),
    invCol.accessor('status', {
      header: () => 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    }),
    invCol.display({
      id: 'pdf',
      header: () => 'Invoice',
      cell: ({ row }) => (
        <a
          href={row.original.invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-brand hover:underline"
        >
          PDF
        </a>
      ),
    }),
  ]

  const [expandedLogin, setExpandedLogin] = useState<Set<string>>(new Set())

  const loginTable = useReactTable({
    data: loginQuery.data ?? [],
    columns: [
      loginCol.display({
        id: 'ok',
        header: () => '',
        cell: ({ row }) => (
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              row.original.success ? 'bg-success' : 'bg-error'
            }`}
          />
        ),
      }),
      loginCol.accessor('ip', { header: () => 'IP' }),
      loginCol.accessor('location', {
        header: () => 'Location',
        cell: ({ getValue }) => getValue() ?? '—',
      }),
      loginCol.accessor('userAgent', {
        header: () => 'User agent',
        cell: ({ row }) => {
          const full = row.original.userAgent
          const short =
            full.length > 48 ? `${full.slice(0, 48)}…` : full
          return (
            <button
              type="button"
              className="max-w-[240px] truncate text-left font-mono text-[11px] text-heading"
              onClick={() => {
                setExpandedLogin((prev) => {
                  const n = new Set(prev)
                  if (n.has(row.original.id)) n.delete(row.original.id)
                  else n.add(row.original.id)
                  return n
                })
              }}
            >
              {expandedLogin.has(row.original.id) ? full : short}
            </button>
          )
        },
      }),
      loginCol.accessor('occurredAt', {
        header: () => 'Time',
        cell: ({ getValue }) =>
          formatDistanceToNow(new Date(getValue()), { addSuffix: true }),
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
  })

  if (detailQuery.isLoading || !u) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-card shimmer" />
        <div className="h-64 rounded-card shimmer" />
      </div>
    )
  }

  const avgPerRun =
    u.agentRunsTotal > 0
      ? Math.round(u.totalTokensUsed / u.agentRunsTotal)
      : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-divider pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          {u.avatarUrl ? (
            <img
              src={u.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
              {u.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-[22px] font-bold text-heading">
              {u.name}
            </h1>
            <p className="text-sm text-muted">{u.email}</p>
            <span className="mt-2 inline-block rounded-chip bg-output px-2 py-0.5 text-[11px] font-medium uppercase text-muted">
              {u.role}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const { impersonateUrl } = await impersonateUser(id)
              window.open(impersonateUrl, '_blank', 'noopener,noreferrer')
            }}
            className="rounded-card border border-amber-600 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            Impersonate
          </button>
          {u.status === 'suspended' ? (
            <button
              type="button"
              onClick={async () => {
                await reactivateUser(id)
                toast.success('Reactivated')
                void qc.invalidateQueries({ queryKey: ['admin', 'user', id] })
                void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
              }}
              className="rounded-card border border-success px-4 py-2 text-sm font-medium text-success hover:bg-green-50"
            >
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSuspendOpen(true)}
              className="rounded-card border border-error px-4 py-2 text-sm font-medium text-error hover:bg-red-50"
            >
              Suspend
            </button>
          )}
          <button
            type="button"
            onClick={() => setPlanOpen(true)}
            className="rounded-card border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand/10"
          >
            Change plan
          </button>
        </div>
      </div>

      <Tabs.Root defaultValue="profile">
        <Tabs.List className="flex gap-2 border-b border-divider">
          {['profile', 'projects', 'usage', 'billing', 'login'].map((t) => (
            <Tabs.Trigger
              key={t}
              value={t}
              className="px-4 py-2 text-sm font-medium text-muted data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:text-heading"
            >
              {t === 'login' ? 'Login History' : t[0].toUpperCase() + t.slice(1)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="profile" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-card border border-divider bg-card p-4 text-sm">
              <h3 className="mb-3 font-display text-sm font-semibold text-heading">
                Account
              </h3>
              <div className="flex flex-wrap gap-2">
                <PlanBadge plan={u.plan} />
                <StatusBadge status={u.status} />
              </div>
              <p className="mt-3">
                <span className="text-muted">Joined: </span>
                {formatDistanceToNow(new Date(u.joinedAt), { addSuffix: true })}
              </p>
              <p className="mt-2">
                <span className="text-muted">Last active: </span>
                {u.lastActiveAt
                  ? formatDistanceToNow(new Date(u.lastActiveAt), {
                      addSuffix: true,
                    })
                  : '—'}
              </p>
              <p className="mt-2">
                <span className="text-muted">Onboarding: </span>
                {u.onboardingDone ? 'Done' : 'Incomplete'}
              </p>
            </div>
            <div className="rounded-card border border-divider bg-card p-4 text-sm">
              <h3 className="mb-3 font-display text-sm font-semibold text-heading">
                Profile
              </h3>
              <p>
                <span className="text-muted">Bio: </span>
                {u.bio ?? '—'}
              </p>
              <p className="mt-2">
                <span className="text-muted">Company: </span>
                {u.company ?? '—'}
              </p>
              <p className="mt-2">
                <span className="text-muted">Website: </span>
                {u.website ?? '—'}
              </p>
              <p className="mt-2">
                <span className="text-muted">Timezone: </span>
                {u.timezone}
              </p>
            </div>
          </div>
          <label className="block text-xs font-semibold uppercase text-muted">
            Admin notes (private)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => void handleNotesBlur()}
              rows={4}
              placeholder="Add internal notes about this user…"
              className="mt-1 w-full rounded-card border border-divider bg-output px-3 py-2 text-sm"
            />
          </label>
        </Tabs.Content>

        <Tabs.Content value="projects" className="mt-6">
          <DataTable
            data={projectsQuery.data ?? []}
            columns={projectColumns}
            isLoading={projectsQuery.isLoading}
            onRowClick={(row) => router.push(`/admin/projects/${row.id}`)}
            getRowId={(r) => r.id}
          />
        </Tabs.Content>

        <Tabs.Content value="usage" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total tokens', v: formatNumber(u.totalTokensUsed) },
              {
                label: 'This month',
                v: formatNumber(u.tokensUsedThisMonth),
              },
              { label: 'Agent runs (total)', v: String(u.agentRunsTotal) },
              { label: 'Avg / run', v: formatNumber(avgPerRun) },
            ].map((c) => (
              <div key={c.label} className="rounded-card bg-card p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {c.label}
                </p>
                <p className="mt-2 font-display text-xl font-bold text-heading">
                  {c.v}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-card border border-divider bg-card p-4">
            <h3 className="mb-3 font-display text-sm font-semibold text-heading">
              Agent breakdown
            </h3>
            {u.topAgentBreakdown && u.topAgentBreakdown.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="py-1">Agent</th>
                    <th className="py-1">Tokens</th>
                    <th className="py-1">Runs</th>
                    <th className="py-1">Avg / run</th>
                  </tr>
                </thead>
                <tbody>
                  {u.topAgentBreakdown.map((a) => (
                    <tr key={a.agentType} className="border-t border-divider">
                      <td className="py-2 capitalize">{a.agentType.replace(/_/g, ' ')}</td>
                      <td className="py-2">{formatNumber(a.tokens)}</td>
                      <td className="py-2">{a.requests}</td>
                      <td className="py-2">{a.avgTokensPerRun}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted">No agent usage recorded.</p>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="billing" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-divider bg-card p-4">
            <div>
              <p className="text-xs text-muted">Current plan</p>
              <PlanBadge plan={u.plan} />
            </div>
            <button
              type="button"
              onClick={() => setPlanOpen(true)}
              className="rounded-card border border-brand px-3 py-1.5 text-sm text-brand"
            >
              Change plan
            </button>
          </div>
          <DataTable
            data={invoicesQuery.data ?? []}
            columns={invoiceColumns}
            isLoading={invoicesQuery.isLoading}
          />
        </Tabs.Content>

        <Tabs.Content value="login" className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              {loginTable.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="bg-output">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="py-2 px-4 text-left text-[12px] font-medium uppercase tracking-wide text-muted"
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loginTable.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-divider">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Content>
      </Tabs.Root>

      <p className="text-sm">
        <Link href="/admin/users" className="text-brand hover:underline">
          ← Back to users
        </Link>
      </p>

      <ChangePlanModal
        open={planOpen}
        onOpenChange={setPlanOpen}
        currentPlan={u.plan}
        onConfirm={async (plan, note) => {
          await changeUserPlan(id, plan, note)
          toast.success('Plan updated')
          void qc.invalidateQueries({ queryKey: ['admin', 'user', id] })
          void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
        }}
      />
      <SuspendUserModal
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onConfirm={async (reason) => {
          await suspendUser(id, reason)
          toast.success('User suspended')
          void qc.invalidateQueries({ queryKey: ['admin', 'user', id] })
          void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
        }}
      />
    </div>
  )
}
