'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import * as Switch from '@radix-ui/react-switch'
import type { FeatureFlag } from '@/types'
import { PlanBadge } from '@/components/common/PlanBadge'
import { cn } from '@/lib/cn'

const FLAG_ORDER = [
  'design_mode',
  'rag_ai',
  'growth_dashboard',
  'ai_code_export',
  'multi_model_select',
  'team_collaboration',
]

interface FeatureFlagsTableProps {
  flags: FeatureFlag[]
  isLoading: boolean
  onUpdate: (
    flagId: string,
    payload: Partial<FeatureFlag>,
  ) => Promise<void>
}

export function FeatureFlagsTable({
  flags,
  isLoading,
  onUpdate,
}: FeatureFlagsTableProps) {
  const sorted = useMemo(() => {
    const idx = (k: string) => {
      const i = FLAG_ORDER.indexOf(k)
      return i === -1 ? 999 : i
    }
    return [...flags].sort((a, b) => idx(a.key) - idx(b.key))
  }, [flags])

  if (isLoading) {
    return (
      <div className="bg-card rounded-card shadow-sm overflow-hidden">
        <div className="border-b border-divider p-3">
          <div className="h-12 w-full shimmer rounded-card" />
        </div>
        <div className="divide-y divide-divider">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4">
              <div className="h-10 flex-1 shimmer rounded-card" />
              <div className="h-8 w-12 shimmer rounded-full" />
              <div className="h-6 w-32 shimmer rounded-card" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (flags.length === 0) {
    return (
      <div className="bg-card rounded-card shadow-sm p-8 text-center text-sm text-muted">
        No feature flags configured
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-card p-3 text-xs text-blue-700">
        Rollout % uses a user ID hash to consistently show/hide features to the
        same users. 50% = exactly half of users see the feature. 0% = disabled
        for everyone. 100% = enabled for everyone.
      </div>

      <div className="bg-card rounded-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-divider bg-bg/80 text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Enabled</th>
                <th className="px-4 py-3 font-medium">Rollout %</th>
                <th className="px-4 py-3 font-medium">Plan restriction</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {sorted.map((flag) => (
                <FlagRow key={flag.id} flag={flag} onUpdate={onUpdate} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FlagRow({
  flag,
  onUpdate,
}: {
  flag: FeatureFlag
  onUpdate: (
    flagId: string,
    payload: Partial<FeatureFlag>,
  ) => Promise<void>
}) {
  const [localRollout, setLocalRollout] = useState(flag.rolloutPercent)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  useEffect(() => {
    setLocalRollout(flag.rolloutPercent)
  }, [flag.rolloutPercent])

  const scheduleCommit = (n: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void onUpdate(flag.id, { rolloutPercent: n })
    }, 500)
  }

  return (
    <tr>
      <td className="px-4 py-3 align-top">
        <span className="inline-block rounded-chip bg-output px-2 py-0.5 font-mono text-[12px] text-heading">
          {flag.key}
        </span>
        <p className="mt-1 max-w-xs text-[13px] text-muted">{flag.description}</p>
      </td>
      <td className="px-4 py-3 align-middle">
        <Switch.Root
          checked={flag.enabled}
          onCheckedChange={(v) => void onUpdate(flag.id, { enabled: v })}
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors',
            flag.enabled ? 'bg-brand' : 'bg-divider',
          )}
        >
          <Switch.Thumb
            className={cn(
              'block h-5 w-5 translate-x-0.5 translate-y-0.5 rounded-full bg-white shadow transition-transform',
              flag.enabled && 'translate-x-5',
            )}
          />
        </Switch.Root>
      </td>
      <td className="px-4 py-3 align-middle">
        <div
          className={cn(
            'flex flex-col gap-1 max-w-[200px]',
            !flag.enabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            role="slider"
            disabled={!flag.enabled}
            value={localRollout}
            onChange={(e) => setLocalRollout(Number(e.target.value))}
            onMouseUp={(e) =>
              scheduleCommit(Number((e.target as HTMLInputElement).value))
            }
            onTouchEnd={(e) =>
              scheduleCommit(Number((e.target as HTMLInputElement).value))
            }
            className="w-full accent-brand disabled:cursor-not-allowed"
          />
          <span className="text-[14px] font-medium text-brand">
            {localRollout}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-wrap gap-1">
          {flag.planRestriction.length === 0 ? (
            <span className="inline-block rounded-chip bg-green-50 px-2 py-0.5 text-[11px] font-medium text-success">
              All plans
            </span>
          ) : (
            flag.planRestriction.map((p) => (
              <PlanBadge key={p} plan={p} />
            ))
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-[12px] text-muted whitespace-nowrap">
        {formatDistanceToNow(new Date(flag.updatedAt), { addSuffix: true })}
      </td>
    </tr>
  )
}
