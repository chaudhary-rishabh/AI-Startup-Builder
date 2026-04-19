'use client'

import type { UserPlan } from '@/types'
import { cn } from '@/lib/cn'

const STYLES: Record<UserPlan, string> = {
  free: 'bg-gray-100 text-gray-600',
  pro: 'bg-brand/10 text-brand',
  team: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

interface PlanBadgeProps {
  plan: UserPlan | string
  className?: string
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const p = plan.toLowerCase() as UserPlan
  const styles = STYLES[p] ?? 'bg-gray-100 text-gray-600'
  return (
    <span
      className={cn(
        'inline-block text-[10px] rounded-chip px-1.5 py-0.5 font-medium uppercase tracking-wide',
        styles,
        className,
      )}
    >
      {String(plan).toUpperCase()}
    </span>
  )
}
