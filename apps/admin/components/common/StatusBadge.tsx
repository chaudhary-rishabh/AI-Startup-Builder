'use client'

import { cn } from '@/lib/cn'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STYLE_MAP: Record<string, string> = {
  active: 'bg-green-50 text-success',
  suspended: 'bg-red-50 text-error',
  unverified: 'bg-amber-50 text-warning',
  succeeded: 'bg-green-50 text-success',
  paid: 'bg-green-50 text-success',
  failed: 'bg-red-50 text-error',
  refunded: 'bg-blue-50 text-blue-600',
  pending: 'bg-amber-50 text-warning',
  open: 'bg-amber-50 text-warning',
  void: 'bg-gray-50 text-gray-500',
  up: 'bg-green-50 text-success',
  degraded: 'bg-amber-50 text-warning',
  down: 'bg-red-50 text-error',
  launched: 'bg-purple-50 text-purple-600',
  archived: 'bg-gray-50 text-gray-500',
  deleted: 'bg-red-50 text-error',
  critical: 'bg-red-100 text-error font-bold',
  error: 'bg-red-50 text-error',
  warning: 'bg-amber-50 text-warning',
}

const DOT_STATUSES = new Set(['up', 'degraded', 'down'])

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/\s+/g, '_')
  const styles = STYLE_MAP[key] ?? 'bg-gray-100 text-gray-600'
  const showDot = DOT_STATUSES.has(key)
  const sizeCls =
    size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-chip font-medium capitalize',
        sizeCls,
        styles,
      )}
    >
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            key === 'up' && 'bg-success',
            key === 'degraded' && 'bg-warning',
            key === 'down' && 'bg-error',
          )}
          aria-hidden
        />
      )}
      {status.replace(/_/g, ' ')}
    </span>
  )
}
