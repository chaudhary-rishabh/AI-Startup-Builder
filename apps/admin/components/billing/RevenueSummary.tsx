'use client'

import { formatCents } from '@/lib/dateRange'
import type { AdminRevenueSummary } from '@/types'
import { cn } from '@/lib/cn'

interface RevenueSummaryProps {
  summary: AdminRevenueSummary | undefined
  isLoading: boolean
}

function ChangeBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex rounded-chip bg-gray-50 px-2 py-0.5 text-xs text-muted">
        —
      </span>
    )
  }
  const positive = value > 0
  return (
    <span
      className={cn(
        'inline-flex rounded-chip px-2 py-0.5 text-xs',
        positive ? 'bg-green-50 text-success' : 'bg-red-50 text-error',
      )}
    >
      {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

export function RevenueSummary({ summary, isLoading }: RevenueSummaryProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[120px] rounded-card bg-card p-5 shadow-sm shimmer" />
        ))}
      </div>
    )
  }

  const cards = [
    { label: 'MRR', value: formatCents(summary.mrrCents), change: summary.changes.mrr },
    { label: 'ARR', value: formatCents(summary.arrCents), change: summary.changes.arr },
    {
      label: 'Churn Rate',
      value: `${summary.churnRate.toFixed(1)}%`,
      change: summary.changes.churnRate,
    },
    { label: 'LTV', value: formatCents(summary.ltv), change: summary.changes.ltv },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative rounded-card bg-card p-5 shadow-sm"
        >
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">
            {c.label}
          </p>
          <p className="font-display text-[28px] font-bold text-heading leading-tight">
            {c.value}
          </p>
          <div className="absolute bottom-4 right-4">
            <ChangeBadge value={c.change} />
          </div>
        </div>
      ))}
    </div>
  )
}
