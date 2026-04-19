'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'
import { useState } from 'react'
import type { UserPlan } from '@/types'
import { cn } from '@/lib/cn'

interface ChangePlanModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  currentPlan: string
  onConfirm: (plan: UserPlan, note: string) => Promise<void>
}

const PLANS: UserPlan[] = ['free', 'pro', 'team', 'enterprise']

export function ChangePlanModal({
  open,
  onOpenChange,
  currentPlan,
  onConfirm,
}: ChangePlanModalProps) {
  const [plan, setPlan] = useState<UserPlan>(
    () => (PLANS.includes(currentPlan as UserPlan) ? (currentPlan as UserPlan) : 'pro'),
  )
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await onConfirm(plan, note.trim())
      setNote('')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (v) setPlan(PLANS.includes(currentPlan as UserPlan) ? (currentPlan as UserPlan) : 'pro')
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-panel bg-card p-6 shadow-lg',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-base font-semibold text-heading">
              Change plan
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-chip p-1 text-muted hover:text-heading"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-heading">
              Plan
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as UserPlan)}
              className="h-10 w-full rounded-card border border-divider bg-white px-3 text-sm"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <label className="block text-xs font-semibold uppercase tracking-wide text-heading">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Internal note (required for audit)…"
              className="w-full rounded-card border border-divider bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="h-9 rounded-card border border-divider px-4 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              className="inline-flex h-9 items-center justify-center rounded-card bg-brand px-4 text-sm font-semibold text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Update Plan'
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
