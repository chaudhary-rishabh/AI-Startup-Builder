'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  isLoading = false,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      /* caller handles toast */
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-panel bg-card p-6 shadow-lg',
          )}
        >
          <AlertDialog.Title className="font-display text-base font-semibold text-heading">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-sm text-muted">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="h-9 rounded-card border border-divider px-4 text-sm font-medium text-heading hover:bg-bg"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleConfirm()}
              className={cn(
                'inline-flex h-9 min-w-[96px] items-center justify-center rounded-card px-4 text-sm font-semibold text-white',
                variant === 'danger' && 'bg-error hover:opacity-90',
                variant === 'warning' && 'bg-warning hover:opacity-90',
                variant === 'default' && 'bg-brand hover:opacity-90',
                isLoading && 'opacity-70',
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
