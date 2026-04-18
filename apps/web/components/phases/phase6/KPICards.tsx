'use client'

import { useMemo } from 'react'

export interface KpiValues {
  activeUsers: number
  retentionRate: number
  churnPercent: number
  mrr: number
}

interface KPICardsProps {
  kpis: KpiValues
  isStreaming: boolean
}

function Sparkline({ seed }: { seed: number }): JSX.Element {
  const pts = useMemo(() => {
    const out: number[] = []
    let s = seed % 1000
    for (let i = 0; i < 7; i += 1) {
      s = (s * 9301 + 49297) % 233280
      out.push(20 + (s / 233280) * 60)
    }
    return out
  }, [seed])
  const d = pts.map((y, i) => `${(i / 6) * 100},${80 - y}`).join(' L')
  return (
    <svg viewBox="0 0 100 80" className="mt-2 h-10 w-full" aria-hidden>
      <path d={`M ${d}`} fill="none" stroke="#16A34A" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const cards: Array<{ key: keyof KpiValues; label: string; format: (v: KpiValues) => string }> = [
  { key: 'activeUsers', label: 'Active Users', format: (v) => v.activeUsers.toLocaleString() },
  { key: 'retentionRate', label: 'Retention', format: (v) => `${Math.round(v.retentionRate * 100)}%` },
  { key: 'churnPercent', label: 'Churn', format: (v) => `${(v.churnPercent * 100).toFixed(1)}%` },
  { key: 'mrr', label: 'MRR', format: (v) => `$${v.mrr.toLocaleString()}` },
]

export function KPICards({ kpis, isStreaming }: KPICardsProps): JSX.Element {
  const seed = kpis.activeUsers + kpis.mrr
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`rounded-card bg-card p-6 shadow-sm ${isStreaming ? 'animate-pulse' : ''}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
          <p className="mt-2 font-display text-[28px] font-bold text-heading">{c.format(kpis)}</p>
          <Sparkline seed={seed + c.key.length} />
        </div>
      ))}
    </div>
  )
}
