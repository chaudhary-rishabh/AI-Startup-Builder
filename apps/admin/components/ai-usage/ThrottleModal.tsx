'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AITopUser } from '@/types'
import { cn } from '@/lib/cn'

interface ThrottleModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  user: AITopUser | null
  onConfirm: (userId: string, requestsPerMinute: number) => Promise<void>
}

export function ThrottleModal({
  open,
  onOpenChange,
  user,
  onConfirm,
}: ThrottleModalProps) {
  const [rpm, setRpm] = useState(60)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) setRpm(60)
  }, [user])

  const submit = async () => {
    if (!user) return
    setLoading(true)
    try {
      await onConfirm(user.userId, Math.max(1, Math.round(rpm)))
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
              Throttle user
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 text-muted">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <p className="mt-1 text-sm text-muted">
            {user?.userName} — cap AI requests per minute for this account.
          </p>
          <label className="mt-4 block text-sm">
            Requests per minute
            <input
              type="number"
              min={1}
              value={rpm}
              onChange={(e) => setRpm(Number(e.target.value))}
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
              disabled={loading}
              onClick={() => void submit()}
              className="inline-flex items-center justify-center rounded-card bg-brand px-4 py-2 text-sm text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
