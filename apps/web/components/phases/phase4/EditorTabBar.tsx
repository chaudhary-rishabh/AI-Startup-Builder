'use client'

import { ChevronLeft, ChevronRight, FileCode2, FileJson, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { EditorTab } from '@/types'

function tabIcon(path: string): JSX.Element {
  const lower = path.toLowerCase()
  if (lower.endsWith('.json')) return <FileJson size={10} className="text-amber-600" />
  return <FileCode2 size={10} className="text-[#0D9488]" />
}

interface EditorTabBarProps {
  tabs: EditorTab[]
  activeTab: string | null
  onTabClick: (path: string) => void
  onTabClose: (path: string) => void
}

export function EditorTabBar({ tabs, activeTab, onTabClick, onTabClose }: EditorTabBarProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setShowLeft(scrollLeft > 2)
    setShowRight(scrollLeft + clientWidth < scrollWidth - 2)
  }, [])

  useEffect(() => {
    updateOverflow()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateOverflow)
    const ro = new ResizeObserver(updateOverflow)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateOverflow)
      ro.disconnect()
    }
  }, [tabs, updateOverflow])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!activeTab || !tabs.length) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        onTabClose(activeTab)
      }
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        const idx = tabs.findIndex((t) => t.path === activeTab)
        if (idx < 0) return
        const next = e.shiftKey ? tabs[idx - 1] ?? tabs[tabs.length - 1] : tabs[idx + 1] ?? tabs[0]
        if (next) onTabClick(next.path)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTab, onTabClick, onTabClose, tabs])

  return (
    <div className="relative flex h-9 shrink-0 items-center border-b border-slate-700 bg-[#0F172A]">
      {showLeft ? (
        <button
          type="button"
          aria-label="Scroll tabs left"
          className="absolute left-0 z-10 flex h-full w-7 items-center justify-center border-r border-slate-700 bg-[#0F172A] text-slate-400"
          onClick={() => scrollRef.current?.scrollBy({ left: -120, behavior: 'smooth' })}
        >
          <ChevronLeft size={14} />
        </button>
      ) : null}
      <div
        ref={scrollRef}
        className={`flex min-w-0 flex-1 overflow-x-auto scrollbar-none ${showLeft ? 'pl-7' : ''} ${showRight ? 'pr-7' : ''}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.path === activeTab
          return (
            <div
              key={tab.path}
              className={`group flex h-9 min-w-[80px] max-w-[160px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-slate-700 px-3 ${
                isActive ? 'border-b-transparent bg-slate-800' : 'border-b border-slate-700 bg-[#0F172A]'
              }`}
              onClick={() => onTabClick(tab.path)}
              role="tab"
              aria-selected={isActive}
            >
              {tabIcon(tab.path)}
              <span className={`truncate text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{tab.path.split('/').pop()}</span>
              {tab.isDirty ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D9488]" /> : null}
              <button
                type="button"
                aria-label={`Close ${tab.path}`}
                className="ml-auto hidden shrink-0 text-slate-500 group-hover:block"
                onClick={(ev) => {
                  ev.stopPropagation()
                  onTabClose(tab.path)
                }}
              >
                <X size={10} />
              </button>
            </div>
          )
        })}
      </div>
      {showRight ? (
        <button
          type="button"
          aria-label="Scroll tabs right"
          className="absolute right-0 z-10 flex h-full w-7 items-center justify-center border-l border-slate-700 bg-[#0F172A] text-slate-400"
          onClick={() => scrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' })}
        >
          <ChevronRight size={14} />
        </button>
      ) : null}
    </div>
  )
}
