'use client'

import { motion } from 'framer-motion'

interface BulkActionsProps {
  selectedIds: string[]
  onClear: () => void
  onBulkSuspend: () => void
  onBulkExport: () => void
}

export function BulkActions({
  selectedIds,
  onClear,
  onBulkSuspend,
  onBulkExport,
}: BulkActionsProps) {
  const n = selectedIds.length
  if (n === 0) return null

  return (
    <motion.div
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      exit={{ y: 80 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed bottom-0 left-60 right-0 z-40 flex h-14 items-center gap-3 border-t border-divider bg-heading px-6 text-white shadow-[0_-4px_12px_rgba(0,0,0,0.2)]"
    >
      <span className="text-sm">
        {n} user{n === 1 ? '' : 's'} selected
      </span>
      <button
        type="button"
        onClick={onBulkSuspend}
        className="rounded-card border border-red-300 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-900/40"
      >
        Suspend Selected
      </button>
      <button
        type="button"
        onClick={onBulkExport}
        className="rounded-card border border-teal-300 px-3 py-1.5 text-xs font-medium text-teal-100 hover:bg-teal-900/30"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs text-white/60 hover:text-white"
      >
        Clear
      </button>
    </motion.div>
  )
}
