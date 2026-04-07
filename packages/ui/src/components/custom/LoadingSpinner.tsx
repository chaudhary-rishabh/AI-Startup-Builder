import * as React from 'react'

import { cn } from '../../lib/cn'

type SpinnerSize = 'sm' | 'md' | 'lg'
type SpinnerMode = 'design' | 'dev' | 'default'

const SIZE_MAP: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
}

const COLOR_MAP: Record<SpinnerMode, string> = {
  design:  '#8B6F47',  // Brand brown — Design Mode
  dev:     '#0D9488',  // Teal — Dev Mode
  default: '#8B6F47',  // Default to brand brown
}

interface LoadingSpinnerProps {
  size?: SpinnerSize
  mode?: SpinnerMode
  className?: string
  label?: string
}

/**
 * Animated SVG spinner.
 * design mode → brand brown, dev mode → teal, default → brand brown.
 */
export function LoadingSpinner({
  size = 'md',
  mode = 'default',
  className,
  label = 'Loading…',
}: LoadingSpinnerProps) {
  const px = SIZE_MAP[size]
  const color = COLOR_MAP[mode]
  const strokeWidth = size === 'sm' ? 2 : 2.5
  const r = (px - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * r

  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        fill="none"
        aria-hidden="true"
        className="animate-spin"
      >
        {/* Track */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeOpacity={0.2}
        />
        {/* Arc — ~75% of circle */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
          transform={`rotate(-90 ${px / 2} ${px / 2})`}
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
