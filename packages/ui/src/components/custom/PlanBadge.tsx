import * as React from 'react'

import { cn } from '../../lib/cn'

type Plan = 'free' | 'pro' | 'enterprise'

const PLAN_CONFIG: Record<Plan, { label: string; bg: string; text: string; ring: string }> = {
  free:       { label: 'Free',       bg: 'bg-slate-100',  text: 'text-slate-600', ring: 'ring-slate-200'  },
  pro:        { label: 'Pro',        bg: 'bg-[#8B6F47]',  text: 'text-white',     ring: 'ring-[#8B6F47]'  },
  enterprise: { label: 'Enterprise', bg: 'bg-slate-800',  text: 'text-white',     ring: 'ring-slate-700'  },
}

interface PlanBadgeProps {
  plan: Plan
  className?: string
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const config = PLAN_CONFIG[plan]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
        config.bg,
        config.text,
        config.ring,
        className,
      )}
      aria-label={`Plan: ${config.label}`}
    >
      {config.label}
    </span>
  )
}
