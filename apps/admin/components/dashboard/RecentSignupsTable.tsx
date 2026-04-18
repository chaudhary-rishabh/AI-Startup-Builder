'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/cn'
import type { RecentSignup } from '@/types'

interface RecentSignupsTableProps {
  signups: RecentSignup[]
  isLoading: boolean
}

function PlanBadge({ plan }: { plan: RecentSignup['plan'] }) {
  const styles: Record<RecentSignup['plan'], string> = {
    free: 'bg-gray-100 text-gray-600',
    pro: 'bg-brand/10 text-brand',
    team: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700',
  }
  const labels: Record<RecentSignup['plan'], string> = {
    free: 'Free',
    pro: 'Pro',
    team: 'Team',
    enterprise: 'Enterprise',
  }
  return (
    <span
      className={cn(
        'text-[11px] rounded-chip px-2 py-0.5 font-medium',
        styles[plan],
      )}
    >
      {labels[plan]}
    </span>
  )
}

function StatusBadge({ status }: { status: RecentSignup['status'] }) {
  const styles: Record<RecentSignup['status'], string> = {
    active: 'bg-green-50 text-success',
    unverified: 'bg-amber-50 text-warning',
    suspended: 'bg-red-50 text-error',
  }
  const labels: Record<RecentSignup['status'], string> = {
    active: 'Active',
    unverified: 'Unverified',
    suspended: 'Suspended',
  }
  return (
    <span
      className={cn(
        'text-[11px] rounded-chip px-2 py-0.5 font-medium',
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  )
}

function initialsFromName(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function RecentSignupsTable({
  signups,
  isLoading,
}: RecentSignupsTableProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="divide-y divide-divider">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="w-8 h-8 rounded-full shimmer flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 shimmer rounded" />
              <div className="h-2 w-48 shimmer rounded" />
              <div className="h-2 w-24 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="divide-y divide-divider">
      {signups.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => router.push(`/admin/users/${u.id}`)}
          className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-bg/80 transition-colors"
        >
          {u.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-provided URLs
            <img
              src={u.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              {initialsFromName(u.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-heading truncate">
              {u.name}
            </p>
            <p className="text-xs text-muted truncate">{u.email}</p>
          </div>
          <PlanBadge plan={u.plan} />
          <span className="text-xs text-muted whitespace-nowrap hidden sm:block">
            {formatDistanceToNow(new Date(u.signedUpAt), { addSuffix: true })}
          </span>
          <StatusBadge status={u.status} />
        </button>
      ))}
    </div>
  )
}
