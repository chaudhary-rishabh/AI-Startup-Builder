'use client'

import type { ServiceHealthCard } from '@/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/cn'
import { formatDistanceToNow } from 'date-fns'

const ORDER = [
  'API Gateway',
  'Database',
  'AI Proxy',
  'Auth',
  'Storage',
  'Queue',
] as const

interface ServiceStatusCardsProps {
  services: ServiceHealthCard[] | undefined
  isLoading: boolean
}

function mergeOrder(services: ServiceHealthCard[]): ServiceHealthCard[] {
  return ORDER.map((name) => {
    const found = services.find((s) => s.name === name)
    if (found) return found
    return {
      name,
      status: 'down',
      uptimePercent: 0,
      lastIncidentAt: null,
      responseTimeMs: 0,
      endpoint: '/health',
    }
  })
}

export function ServiceStatusCards({
  services,
  isLoading,
}: ServiceStatusCardsProps) {
  const list = services ? mergeOrder(services) : []

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-card shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {list.map((s) => (
        <div
          key={s.name}
          className="cursor-default rounded-card bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-heading">{s.name}</p>
            <StatusBadge status={s.status} size="sm" />
          </div>
          <p
            className={cn(
              'mt-3 font-mono text-base',
              s.responseTimeMs < 200 && 'text-success',
              s.responseTimeMs >= 200 &&
                s.responseTimeMs <= 500 &&
                'text-warning',
              s.responseTimeMs > 500 && 'text-error',
            )}
          >
            {s.responseTimeMs}ms
          </p>
          <p className="mt-2 text-[12px] text-muted">
            Uptime: {s.uptimePercent.toFixed(2)}%
          </p>
          {s.lastIncidentAt && (
            <p className="mt-1 text-[10px] text-error">
              Last incident:{' '}
              {formatDistanceToNow(new Date(s.lastIncidentAt), {
                addSuffix: true,
              })}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
