import * as React from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../shadcn/button'

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * Centered empty state with illustration placeholder, title, description, and optional CTA.
 * Used for empty project lists, empty search results, etc.
 */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
        className,
      )}
    >
      {/* Illustration placeholder — beige circle */}
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-sidebar shadow-sm-card"
        aria-hidden="true"
      >
        <span className="text-4xl" role="img" aria-label="Empty">
          🗂️
        </span>
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-base font-bold text-brand-dark font-display">{title}</h2>
        <p className="text-sm text-brand-light font-body leading-relaxed">{description}</p>
      </div>

      {action && (
        <Button
          variant="outline"
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
