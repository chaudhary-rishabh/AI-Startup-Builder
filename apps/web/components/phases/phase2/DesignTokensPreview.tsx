'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useProjectStore } from '@/store/projectStore'
import type { DesignTokens } from '@/types'

interface DesignTokensPreviewProps {
  designTokens: DesignTokens | null
  isStreaming: boolean
}

export function DesignTokensPreview({ designTokens, isStreaming }: DesignTokensPreviewProps): JSX.Element {
  const [copied, setCopied] = useState(false)
  const setDesignTokens = useProjectStore((state) => state.setDesignTokens)

  useEffect(() => {
    if (designTokens) setDesignTokens(designTokens)
  }, [designTokens, setDesignTokens])

  const spacingBoxes = useMemo(() => {
    if (!designTokens) return [1, 2, 4, 8, 16]
    const base = Number.parseInt(designTokens.spacing, 10) || 4
    return [1, 2, 4, 8, 16].map((multiplier) => base * multiplier)
  }, [designTokens])

  if (!designTokens || isStreaming) {
    return <div className="shimmer h-28 rounded-card border border-divider" />
  }

  return (
    <section className="flex flex-wrap gap-4 rounded-card border border-divider bg-card p-4">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(designTokens.primaryColor)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
        className="flex flex-col items-center"
      >
        <span className="h-10 w-10 rounded-full border border-divider" style={{ backgroundColor: designTokens.primaryColor }} />
        <span className="mt-1 font-mono text-xs text-muted">{designTokens.primaryColor}</span>
        <span className="text-[10px] uppercase text-muted">Primary</span>
        {copied ? <Check size={12} className="text-success" /> : <Copy size={12} className="text-muted" />}
      </button>

      <div className="flex flex-col items-center">
        <span className="h-8 w-8 rounded-full border border-divider" style={{ backgroundColor: designTokens.backgroundColor }} />
        <span className="mt-1 font-mono text-xs text-muted">{designTokens.backgroundColor}</span>
      </div>

      <div className="flex flex-col">
        <span className="text-3xl text-heading" style={{ fontFamily: designTokens.fontFamily }}>
          Aa
        </span>
        <span className="font-mono text-xs text-muted">{designTokens.fontFamily}</span>
      </div>

      <div className="flex flex-col items-center">
        <span className="h-8 w-8 border border-divider bg-divider" style={{ borderRadius: designTokens.borderRadius }} />
        <span className="font-mono text-xs text-muted">{designTokens.borderRadius}</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-end gap-1">
          {spacingBoxes.map((width) => (
            <span key={width} className="h-4 bg-brand" style={{ width }} />
          ))}
        </div>
        <span className="font-mono text-xs text-muted">{designTokens.spacing}</span>
      </div>
    </section>
  )
}
