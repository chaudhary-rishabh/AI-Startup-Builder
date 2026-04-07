import * as React from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../shadcn/dialog'
import { LoadingSpinner } from './LoadingSpinner'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: 'default' | 'destructive'
  loading?: boolean
}

/**
 * Confirmation dialog wrapping Radix Dialog.
 * variant='destructive' → red confirm button.
 * Escape key closes. Loading state disables interaction.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={loading ? () => { /* blocked while loading */ } : onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        // Prevent close via outside click while loading
        {...(loading ? { onInteractOutside: (e: { preventDefault: () => void }) => e.preventDefault() } : {})}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
            className={cn('min-w-[100px]', loading && 'cursor-not-allowed')}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" mode={variant === 'destructive' ? 'default' : 'default'} />
                Processing…
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
