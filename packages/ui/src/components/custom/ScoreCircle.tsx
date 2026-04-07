import * as React from 'react'

import { cn } from '../../lib/cn'

interface ScoreCircleProps {
  score: number  // 0–100
  size?: number  // px, default 96
  className?: string
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#16A34A' // green
  if (score >= 40) return '#D97706' // amber
  return '#DC2626'                  // red
}

/**
 * Animated SVG circle that draws clockwise from 0 to score on mount.
 * Shows score number and color-coded ring based on demand score bands.
 */
export function ScoreCircle({ score, size = 96, className }: ScoreCircleProps) {
  const clamped = Math.min(100, Math.max(0, score))
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clamped / 100) * circumference
  const color = getScoreColor(clamped)
  const cx = size / 2
  const cy = size / 2

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Demand score: ${clamped} out of 100`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#E8DFD0"
          strokeWidth={8}
        />
        {/* Score arc — animates on mount via CSS */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
          style={{ '--tw-enter-opacity': 1 } as React.CSSProperties}
        />
      </svg>

      {/* Score label */}
      <span
        className="absolute flex flex-col items-center"
        style={{ color: '#5C4425' }}
      >
        <span
          className="font-bold font-display leading-none"
          style={{ fontSize: size * 0.26 }}
        >
          {clamped}
        </span>
        <span
          className="text-brand-light font-body"
          style={{ fontSize: size * 0.12 }}
        >
          /100
        </span>
      </span>
    </div>
  )
}
