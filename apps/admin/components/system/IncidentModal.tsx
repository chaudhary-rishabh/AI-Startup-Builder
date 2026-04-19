'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

interface IncidentModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (payload: {
    title: string
    description: string
    severity: 'minor' | 'major' | 'critical'
  }) => Promise<void>
}

export function IncidentModal({
  open,
  onOpenChange,
  onConfirm,
}: IncidentModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'minor' | 'major' | 'critical'>(
    'minor',
  )
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!title.trim() || !description.trim()) return
    setLoading(true)
    try {
      await onConfirm({
        title: title.trim(),
        description: description.trim(),
        severity,
      })
      onOpenChange(false)
      setTitle('')
      setDescription('')
      setSeverity('minor')
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
              Create incident
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 text-muted">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <label className="mt-4 block text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-card border border-divider px-3 py-2"
            />
          </label>
          <label className="mt-3 block text-sm">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-card border border-divider px-3 py-2"
            />
          </label>
          <label className="mt-3 block text-sm">
            Severity
            <select
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as 'minor' | 'major' | 'critical')
              }
              className="mt-1 w-full rounded-card border border-divider px-3 py-2"
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
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
              disabled={loading || !title.trim() || !description.trim()}
              onClick={() => void submit()}
              className="inline-flex items-center justify-center rounded-card bg-brand px-4 py-2 text-sm text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
