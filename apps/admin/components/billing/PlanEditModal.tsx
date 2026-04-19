'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AdminPlan } from '@/types'
import { cn } from '@/lib/cn'

interface PlanEditModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  plan: AdminPlan | null
  onSave: (payload: {
    name?: string
    priceMonthly?: number
    priceYearly?: number
    tokenLimit?: number
    projectLimit?: number
    features?: string[]
  }) => Promise<void>
}

export function PlanEditModal({
  open,
  onOpenChange,
  plan,
  onSave,
}: PlanEditModalProps) {
  const [name, setName] = useState('')
  const [pm, setPm] = useState(0)
  const [py, setPy] = useState(0)
  const [tl, setTl] = useState(0)
  const [pl, setPl] = useState(0)
  const [feat, setFeat] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (plan) {
      setName(plan.name)
      setPm(plan.priceMonthly)
      setPy(plan.priceYearly)
      setTl(plan.tokenLimit)
      setPl(plan.projectLimit)
      setFeat(plan.features.join('\n'))
    }
  }, [plan])

  const submit = async () => {
    setLoading(true)
    try {
      await onSave({
        name,
        priceMonthly: Math.round(pm),
        priceYearly: Math.round(py),
        tokenLimit: Math.round(tl),
        projectLimit: Math.round(pl),
        features: feat.split('\n').map((s) => s.trim()).filter(Boolean),
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2',
            'rounded-panel bg-card p-6 shadow-lg',
          )}
        >
          <div className="flex items-start justify-between">
            <Dialog.Title className="font-display text-base font-semibold text-heading">
              Edit plan
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 text-muted hover:text-heading">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <label className="block">
              <span className="text-xs font-semibold text-heading">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-card border border-divider px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-heading">
                Monthly price ($)
              </span>
              <input
                type="number"
                value={pm / 100}
                step={0.01}
                onChange={(e) => setPm(Math.round(Number(e.target.value) * 100))}
                className="mt-1 w-full rounded-card border border-divider px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-heading">
                Yearly price ($)
              </span>
              <input
                type="number"
                value={py / 100}
                step={0.01}
                onChange={(e) => setPy(Math.round(Number(e.target.value) * 100))}
                className="mt-1 w-full rounded-card border border-divider px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-heading">Token limit</span>
              <input
                type="number"
                value={tl}
                onChange={(e) => setTl(Number(e.target.value))}
                className="mt-1 w-full rounded-card border border-divider px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-heading">
                Project limit
              </span>
              <input
                type="number"
                value={pl}
                onChange={(e) => setPl(Number(e.target.value))}
                className="mt-1 w-full rounded-card border border-divider px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-heading">
                Features (one per line)
              </span>
              <textarea
                value={feat}
                onChange={(e) => setFeat(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-card border border-divider px-3 py-2 font-mono text-xs"
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">
            Changes propagate to Stripe within 30 seconds.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-card border border-divider px-4 py-2 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              className="inline-flex items-center justify-center rounded-card bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
