'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { getAdminProject } from '@/lib/api/projects.api'
import { formatNumber } from '@/lib/dateRange'
import { StatusBadge } from '@/components/common/StatusBadge'

export default function AdminProjectDetailPage() {
  const params = useParams()
  const id = typeof params['id'] === 'string' ? params['id'] : ''

  const q = useQuery({
    queryKey: ['admin', 'project', id],
    queryFn: () => getAdminProject(id),
    enabled: !!id,
  })

  const p = q.data

  if (q.isLoading) {
    return <div className="h-40 rounded-card shimmer" />
  }

  if (!p) {
    return <p className="text-sm text-muted">Project not found.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            <Link href="/admin/projects" className="text-brand hover:underline">
              ← All projects
            </Link>
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-heading">
            <span className="mr-2">{p.emoji}</span>
            {p.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted">{p.id}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-card border border-divider bg-card p-4 text-sm">
          <p>
            <span className="text-muted">Owner: </span>
            {p.userName}{' '}
            <span className="text-muted">({p.userEmail})</span>
          </p>
          <p className="mt-2">
            <span className="text-muted">Phase: </span>
            {p.currentPhase}
          </p>
          <p className="mt-2">
            <span className="text-muted">Build mode: </span>
            {p.buildMode}
          </p>
          <p className="mt-2">
            <span className="text-muted">Agent runs: </span>
            {p.agentRunCount}
          </p>
          <p className="mt-2">
            <span className="text-muted">Tokens used: </span>
            {formatNumber(p.tokensUsed)}
          </p>
          <p className="mt-2">
            <span className="text-muted">Last active: </span>
            {formatDistanceToNow(new Date(p.lastActiveAt), { addSuffix: true })}
          </p>
          <p className="mt-2">
            <span className="text-muted">Created: </span>
            {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="rounded-card border border-divider bg-card p-4">
        <h2 className="font-display text-sm font-semibold text-heading">
          Phase outputs (read-only)
        </h2>
        <pre className="mt-3 max-h-[420px] overflow-auto rounded-card bg-output p-4 font-mono text-[11px] leading-relaxed text-heading">
          {JSON.stringify(p.phaseOutputs ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  )
}
