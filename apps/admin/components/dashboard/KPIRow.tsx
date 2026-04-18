'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { formatCents, formatNumber, formatPercent } from '@/lib/dateRange'
import type { PlatformKPIs } from '@/types'

interface KPIRowProps {
  kpis: PlatformKPIs | undefined
  isLoading: boolean
}

const KPI_CONFIG = [
  {
    label: 'Total Users',
    key: 'totalUsers' as const,
    changeKey: 'totalUsers' as const,
    format: (v: number) => formatNumber(v),
    href: '/admin/users',
  },
  {
    label: 'Active Today',
    key: 'activeToday' as const,
    changeKey: 'activeToday' as const,
    format: (v: number) => formatNumber(v),
    href: '/admin/users?status=active',
  },
  {
    label: 'New This Week',
    key: 'newThisWeek' as const,
    changeKey: 'newThisWeek' as const,
    format: (v: number) => formatNumber(v),
    href: '/admin/users?sort=newest',
  },
  {
    label: 'Total Projects',
    key: 'totalProjects' as const,
    changeKey: 'totalProjects' as const,
    format: (v: number) => formatNumber(v),
    href: '/admin/projects',
  },
  {
    label: 'Total Revenue',
    key: 'totalRevenueCents' as const,
    changeKey: 'totalRevenue' as const,
    format: (_v: number, kpis: PlatformKPIs) =>
      formatCents(kpis.totalRevenueCents),
    href: '/admin/billing',
  },
  {
    label: 'Avg Session',
    key: 'avgSessionMinutes' as const,
    changeKey: 'avgSession' as const,
    format: (v: number) => `${v}m`,
    href: '/admin/ai-usage',
  },
] as const

function ChangeBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center rounded-chip px-2 py-0.5 text-xs bg-gray-50 text-muted">
        —
      </span>
    )
  }
  const positive = value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip px-2 py-0.5 text-xs',
        positive ? 'bg-green-50 text-success' : 'bg-red-50 text-error',
      )}
    >
      {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

export function KPIRow({ kpis, isLoading }: KPIRowProps) {
  const router = useRouter()

  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-card shadow-sm p-5 h-[120px] shimmer"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {KPI_CONFIG.map((cfg) => {
        const raw =
          cfg.key === 'totalRevenueCents'
            ? kpis.totalRevenueCents
            : kpis[cfg.key]
        const display =
          cfg.key === 'totalRevenueCents'
            ? (cfg.format as (a: number, b: PlatformKPIs) => string)(
                raw as number,
                kpis,
              )
            : (cfg.format as (a: number) => string)(raw as number)
        const change = kpis.changes[cfg.changeKey]

        return (
          <button
            key={cfg.label}
            type="button"
            onClick={() => router.push(cfg.href)}
            className="relative bg-card rounded-card shadow-sm p-5 text-left transition-shadow hover:shadow-md"
          >
            <p className="text-[11px] uppercase tracking-wide text-muted mb-2">
              {cfg.label}
            </p>
            <p className="font-display text-[28px] font-bold text-heading leading-tight">
              {display}
            </p>
            <div className="absolute bottom-4 right-4">
              <ChangeBadge value={change} />
            </div>
          </button>
        )
      })}
    </div>
  )
}
