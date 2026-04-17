'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

import { useUIStore } from '@/store/uiStore'

export function ContextPanel({ children }: { children?: React.ReactNode }): JSX.Element {
  const open = useUIStore((state) => state.contextPanelOpen)
  const setContextPanelOpen = useUIStore((state) => state.setContextPanelOpen)

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.aside
          key="context-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative hidden h-screen overflow-hidden border-l border-divider bg-card shadow-md lg:block"
        >
          <button
            type="button"
            aria-label="Collapse context panel"
            onClick={() => setContextPanelOpen(false)}
            className="absolute -left-3 top-4 rounded-full border border-divider bg-card p-1"
          >
            <ChevronRight size={14} />
          </button>
          <div className="h-full p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Agents</p>
            {children ?? <p className="mt-3 text-xs text-muted">Phase status appears here</p>}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
