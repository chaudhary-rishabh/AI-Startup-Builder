'use client'

import type { Competitor } from '@/types'

export function CompetitorTable({ competitors }: { competitors: Competitor[] }): JSX.Element {
  if (!competitors.length) {
    return <p className="py-10 text-center text-sm italic text-muted">No competitor data yet</p>
  }

  return (
    <div className="overflow-hidden rounded-md border border-divider">
      <table className="w-full table-fixed border-collapse text-left">
        <thead className="bg-divider">
          <tr className="text-[11px] uppercase tracking-[0.08em] text-muted">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Key Features</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Gap</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((competitor, index) => (
            <tr key={competitor.name} className={`${index % 2 ? 'bg-card' : 'bg-bg'} border-b border-divider text-xs text-slate-600`}>
              <td className="px-3 py-4">{competitor.name}</td>
              <td className="px-3 py-4">{competitor.keyFeatures}</td>
              <td className="px-3 py-4">{competitor.price}</td>
              <td className="px-3 py-4">{competitor.gap}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
