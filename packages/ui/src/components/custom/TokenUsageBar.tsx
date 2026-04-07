import * as React from 'react'

import { cn } from '../../lib/cn'

interface TokenUsageBarProps {
  used: number
  limit: number
  className?: string
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function getBarColor(pct: number): string {
  if (pct > 95) return 'bg-red-500'
  if (pct > 80) return 'bg-amber-400'
  return 'bg-green-500'
}

function getTextColor(pct: number): string {
  if (pct > 95) return 'text-red-600'
  if (pct > 80) return 'text-amber-600'
  return 'text-green-700'
}

/**
 * Horizontal token consumption bar.
 * Colors: <80% → green, 80-95% → amber, >95% → red.
 * Shows formatted used/limit values and percentage.
 */
export function TokenUsageBar({ used, limit, className }: TokenUsageBarProps) {
  const safeLimit = limit === 0 ? 1 : limit
  const pct = Math.min(100, Math.round((used / safeLimit) * 100))
  const barColor = getBarColor(pct)
  const textColor = getTextColor(pct)

  return (
    <div className={cn('space-y-1', className)}>
      {/* Labels row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-brand-light font-body">
          {formatTokens(used)} / {formatTokens(limit)} tokens
        </span>
        <span className={cn('font-semibold', textColor)}>{pct}%</span>
      </div>

      {/* Progress track */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-divider"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Token usage: ${pct}%`}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
