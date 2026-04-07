import * as React from 'react'

import { cn } from '../../lib/cn'

type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6

const PHASE_CONFIG: Record<
  PhaseNumber,
  { label: string; bg: string; text: string; ring: string }
> = {
  1: { label: 'Validate', bg: 'bg-violet-100',  text: 'text-violet-800', ring: 'ring-violet-200' },
  2: { label: 'Plan',     bg: 'bg-blue-100',    text: 'text-blue-800',   ring: 'ring-blue-200'   },
  3: { label: 'Design',   bg: 'bg-purple-100',  text: 'text-purple-800', ring: 'ring-purple-200' },
  4: { label: 'Build',    bg: 'bg-teal-100',    text: 'text-teal-800',   ring: 'ring-teal-200'   },
  5: { label: 'Deploy',   bg: 'bg-amber-100',   text: 'text-amber-800',  ring: 'ring-amber-200'  },
  6: { label: 'Growth',   bg: 'bg-green-100',   text: 'text-green-800',  ring: 'ring-green-200'  },
}

interface PhaseBadgeProps {
  phase: PhaseNumber
  size?: 'sm' | 'md'
  className?: string
}

export function PhaseBadge({ phase, size = 'md', className }: PhaseBadgeProps) {
  const config = PHASE_CONFIG[phase]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold ring-1',
        config.bg,
        config.text,
        config.ring,
        size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-[10px]',
        className,
      )}
      aria-label={`Phase ${phase}: ${config.label}`}
    >
      <span className="font-bold">{phase}</span>
      <span>{config.label}</span>
    </span>
  )
}
