'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AdminTransaction } from '@/types'
import { formatCents } from '@/lib/dateRange'
import { cn } from '@/lib/cn'

interface RefundModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  transaction: AdminTransaction | null
  onConfirm: (amountCents: number, reason: string) => Promise<void>
}

export function RefundModal({
  open,
  onOpenChange,
  transaction,
  onConfirm,
}: RefundModalProps) {
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amountCents - transaction.refundedAmountCents)
      setReason('')
    }
  }, [transaction])

  const submit = async () => {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await onConfirm(Math.round(amount), reason.trim())
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
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-panel bg-card p-6 shadow-lg',
          )}
        >
          <div className="flex items-start justify-between">
            <Dialog.Title className="font-display text-base font-semibold text-heading">
              Issue refund
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 text-muted">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <p className="mt-1 text-sm text-muted">
            Max {transaction ? formatCents(transaction.amountCents - transaction.refundedAmountCents) : ''}
          </p>
          <label className="mt-4 block text-sm">
            Amount (cents)
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-card border border-divider px-3 py-2"
            />
          </label>
          <label className="mt-3 block text-sm">
            Reason (required)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-card border border-divider px-3 py-2"
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-card border px-4 py-2 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !reason.trim()}
              onClick={() => void submit()}
              className="inline-flex items-center justify-center rounded-card bg-brand px-4 py-2 text-sm text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refund'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
