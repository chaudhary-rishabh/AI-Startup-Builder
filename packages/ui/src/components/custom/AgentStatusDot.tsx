import * as React from 'react'

import { cn } from '../../lib/cn'

type AgentDotStatus = 'idle' | 'running' | 'done' | 'error'

const STATUS_CONFIG: Record<AgentDotStatus, { bg: string; label: string; animate: boolean }> = {
  idle:    { bg: 'bg-slate-300',  label: 'Idle',    animate: false },
  running: { bg: 'bg-amber-400',  label: 'Running', animate: true  },
  done:    { bg: 'bg-green-500',  label: 'Done',    animate: false },
  error:   { bg: 'bg-red-500',    label: 'Error',   animate: false },
}

interface AgentStatusDotProps {
  status: AgentDotStatus
  className?: string
}

/**
 * 10px indicator dot with pulsing animation for running state.
 * Matches the agent status strip in Phase 1–6 right panels.
 */
export function AgentStatusDot({ status, className }: AgentStatusDotProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn('relative inline-flex h-2.5 w-2.5', className)}
      role="status"
      aria-label={`Agent status: ${config.label}`}
    >
      {config.animate && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            config.bg,
            'animate-ping',
          )}
          aria-hidden="true"
        />
      )}
      <span
        className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', config.bg)}
        aria-hidden="true"
      />
    </span>
  )
}
