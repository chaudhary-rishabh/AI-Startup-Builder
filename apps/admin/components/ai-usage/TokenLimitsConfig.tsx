'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Switch from '@radix-ui/react-switch'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TokenLimitConfig, UserPlan } from '@/types'
import { updateTokenLimit } from '@/lib/api/aiUsage.api'
import { PlanBadge } from '@/components/common/PlanBadge'
import { cn } from '@/lib/cn'

interface TokenLimitsConfigProps {
  limits: TokenLimitConfig[] | undefined
  isLoading: boolean
}

export function TokenLimitsConfig({ limits, isLoading }: TokenLimitsConfigProps) {
  const qc = useQueryClient()
  const [savingPlan, setSavingPlan] = useState<UserPlan | null>(null)
  const [savedPlan, setSavedPlan] = useState<UserPlan | null>(null)

  const mut = useMutation({
    mutationFn: ({
      plan,
      tokenLimit,
      isUnlimited,
    }: {
      plan: UserPlan
      tokenLimit: number
      isUnlimited: boolean
    }) => updateTokenLimit(plan, tokenLimit, isUnlimited),
    onMutate: ({ plan }) => {
      setSavingPlan(plan)
      setSavedPlan(null)
    },
    onSuccess: (_, { plan }) => {
      setSavingPlan(null)
      setSavedPlan(plan)
      setTimeout(() => setSavedPlan(null), 2000)
      void qc.invalidateQueries({ queryKey: ['admin', 'ai-limits'] })
    },
    onError: (e: Error) => {
      setSavingPlan(null)
      toast.error(e.message)
    },
  })

  if (isLoading || !limits) {
    return (
      <div className="space-y-3 rounded-card border border-divider bg-card p-5 shadow-sm">
        <div className="h-5 w-40 shimmer rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 shimmer rounded-card" />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-card border border-divider bg-card p-5 shadow-sm">
      <h3 className="mb-4 font-display text-sm font-semibold text-heading">
        Token limits by plan
      </h3>
      <div className="space-y-4">
        {limits.map((row) => (
          <LimitRow
            key={`${row.plan}-${row.tokenLimit}-${row.isUnlimited}`}
            row={row}
            savingPlan={savingPlan}
            savedPlan={savedPlan}
            mutPending={mut.isPending}
            onSave={(tokenLimit, isUnlimited) =>
              mut.mutate({ plan: row.plan, tokenLimit, isUnlimited })
            }
          />
        ))}
      </div>
    </div>
  )
}

function LimitRow({
  row,
  savingPlan,
  savedPlan,
  mutPending,
  onSave,
}: {
  row: TokenLimitConfig
  savingPlan: UserPlan | null
  savedPlan: UserPlan | null
  mutPending: boolean
  onSave: (tokenLimit: number, isUnlimited: boolean) => void
}) {
  const [draft, setDraft] = useState(String(row.tokenLimit))

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-divider px-3 py-3">
      <PlanBadge plan={row.plan} />
      {row.isUnlimited ? (
        <span className="flex h-9 w-[120px] items-center rounded-card border border-divider bg-output px-2 text-sm font-medium">
          ∞
        </span>
      ) : (
        <input
          type="number"
          disabled={mutPending}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const v = Number(draft)
            if (Number.isNaN(v)) {
              setDraft(String(row.tokenLimit))
              return
            }
            if (v !== row.tokenLimit) onSave(v, false)
          }}
          className="h-9 w-[120px] rounded-card border border-divider px-2 text-sm"
        />
      )}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted">Unlimited</span>
        <Switch.Root
          checked={row.isUnlimited}
          disabled={mutPending}
          onCheckedChange={(isUnlimited) => {
            if (isUnlimited) onSave(row.tokenLimit, true)
            else onSave(row.tokenLimit > 0 ? row.tokenLimit : 50000, false)
          }}
          className="relative h-6 w-11 rounded-full bg-divider data-[state=checked]:bg-brand"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-5" />
        </Switch.Root>
      </div>
      {savingPlan === row.plan && (
        <span className="flex items-center gap-1 text-xs text-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </span>
      )}
      {savedPlan === row.plan && savingPlan !== row.plan && (
        <span className="text-xs text-success">Saved ✓</span>
      )}
    </div>
  )
}
