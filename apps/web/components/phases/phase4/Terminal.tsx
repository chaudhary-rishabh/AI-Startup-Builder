'use client'

import { ChevronDown, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { TerminalLine } from '@/types'

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function lineColor(type: TerminalLine['type']): { text: string; dot: string } {
  switch (type) {
    case 'system':
      return { text: 'text-slate-500 italic', dot: 'bg-slate-500' }
    case 'info':
      return { text: 'text-[#0D9488]', dot: 'bg-[#0D9488]' }
    case 'output':
      return { text: 'text-slate-200', dot: 'bg-slate-400' }
    case 'success':
      return { text: 'text-green-600', dot: 'bg-green-600' }
    case 'error':
      return { text: 'text-red-600', dot: 'bg-red-600' }
    default:
      return { text: 'text-slate-300', dot: 'bg-slate-400' }
  }
}

interface TerminalProps {
  lines: TerminalLine[]
  onClear: () => void
}

export function Terminal({ lines, onClear }: TerminalProps): JSX.Element {
  const [expanded, setExpanded] = useState(true)
  const [height, setHeight] = useState(200)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showChip, setShowChip] = useState(false)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  useEffect(() => {
    if (isAtBottom) {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
      setShowChip(false)
    } else if (lines.length) {
      setShowChip(true)
    }
  }, [lines, isAtBottom])

  const onMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return
    const delta = dragRef.current.startY - e.clientY
    const next = Math.min(400, Math.max(36, dragRef.current.startH + delta))
    setHeight(next)
    if (next <= 40) setExpanded(false)
    else setExpanded(true)
  }, [])

  const onUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }, [onMove])

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { startY: e.clientY, startH: height }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [height, onMove, onUp],
  )

  const collapsed = !expanded || height <= 36

  return (
    <div className="flex shrink-0 flex-col border-t border-slate-700 bg-[#0F172A]" style={{ height: collapsed ? 36 : height }}>
      <div
        role="separator"
        aria-orientation="horizontal"
        className="h-1 cursor-row-resize bg-transparent"
        onMouseDown={startDrag}
        onDoubleClick={() => setExpanded((v) => !v)}
      />
      <header className="flex h-9 shrink-0 items-center justify-between bg-slate-900 px-3">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Terminal</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Clear terminal" className="text-slate-400 hover:text-slate-200" onClick={onClear}>
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            aria-label={expanded ? 'Collapse terminal' : 'Expand terminal'}
            className="text-slate-400 hover:text-slate-200"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : ''} />
          </button>
        </div>
      </header>
      {!collapsed ? (
        <div
          ref={bodyRef}
          className="relative flex-1 overflow-y-auto px-3 py-2 font-mono text-xs"
          onScroll={(ev) => {
            const t = ev.currentTarget
            const near = t.scrollHeight - t.scrollTop - t.clientHeight < 24
            setIsAtBottom(near)
          }}
        >
          {lines.map((line) => {
            const colors = lineColor(line.type)
            return (
              <div key={line.id} className="mb-1 flex gap-2">
                <span className="shrink-0 font-mono text-[10px] text-slate-600">{formatTime(line.timestamp)}</span>
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                <span className={`whitespace-pre-wrap break-all ${colors.text}`}>{line.content}</span>
              </div>
            )
          })}
          {showChip ? (
            <button
              type="button"
              className="sticky bottom-2 left-1/2 mx-auto mt-2 block -translate-x-1/2 rounded-full bg-[#0D9488] px-2 py-0.5 text-[10px] text-white"
              onClick={() => {
                bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
                setShowChip(false)
              }}
            >
              ↓ new output
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
