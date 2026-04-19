'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

interface SuspendUserModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (reason: string) => Promise<void>
}

export function SuspendUserModal({
  open,
  onOpenChange,
  onConfirm,
}: SuspendUserModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await onConfirm(reason.trim())
      setReason('')
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
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-base font-semibold text-heading">
              Suspend user
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
          <Dialog.Description className="mt-1 text-sm text-muted">
            Provide a reason. This is recorded internally.
          </Dialog.Description>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Reason for suspension…"
            className="mt-4 w-full rounded-card border border-divider bg-white px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="h-9 rounded-card border border-divider px-4 text-sm font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !reason.trim()}
              onClick={() => void handleSubmit()}
              className="inline-flex h-9 items-center justify-center rounded-card bg-error px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Suspend'
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
