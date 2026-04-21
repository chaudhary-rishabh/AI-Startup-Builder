'use client'

import Link from 'next/link'

import { formatNumber } from '@/lib/dateRange'
import type { AIUsageOverview } from '@/types'

interface AIUsageOverviewRowProps {
  overview: AIUsageOverview | undefined
  isLoading: boolean
}

export function AIUsageOverviewRow({
  overview,
  isLoading,
}: AIUsageOverviewRowProps) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-card shimmer" />
        ))}
      </div>
    )
  }

  const exhausted = overview.exhaustedUsersCount ?? 0

  type Card =
    | { kind: 'stat'; label: string; value: string; warn?: boolean }
    | {
        kind: 'link'
        label: string
        value: string
        sub: string
        href: string
      }

  const cards: Card[] = [
    { kind: 'stat', label: 'Tokens Today', value: `${formatNumber(overview.tokensToday)}T` },
    {
      kind: 'stat',
      label: 'Tokens This Month',
      value: `${formatNumber(overview.tokensThisMonth)}T`,
    },
    {
      kind: 'stat',
      label: 'Projected Cost',
      value: `$${overview.projectedCostUsd.toFixed(2)}`,
      warn: overview.projectedCostUsd > 500,
    },
    {
      kind: 'stat',
      label: 'Cost This Month',
      value: `$${overview.costThisMonthUsd.toFixed(2)}`,
    },
    {
      kind: 'link',
      label: 'Exhausted Users',
      value: formatNumber(exhausted),
      sub: 'at 0 credits this month',
      href: '/admin/users?creditState=exhausted',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => {
        const inner = (
          <>
            <p className="text-[11px] uppercase tracking-wide text-muted">
              {c.label}
            </p>
            <p
              className={`mt-2 font-display text-xl font-bold ${
                c.kind === 'link' ? 'text-amber-700' : 'text-heading'
              }`}
            >
              {c.value}
            </p>
            {c.kind === 'link' ? (
              <p className="mt-1 text-[11px] text-muted">{c.sub}</p>
            ) : null}
            {c.kind === 'stat' && c.warn ? (
              <span className="mt-1 inline-block rounded-chip bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                High
              </span>
            ) : null}
          </>
        )

        if (c.kind === 'link') {
          return (
            <Link
              key={c.label}
              href={c.href}
              className="block rounded-card bg-card p-5 shadow-sm transition-colors hover:bg-bg"
            >
              {inner}
            </Link>
          )
        }

        return (
          <div key={c.label} className="rounded-card bg-card p-5 shadow-sm">
            {inner}
          </div>
        )
      })}
    </div>
  )
}
