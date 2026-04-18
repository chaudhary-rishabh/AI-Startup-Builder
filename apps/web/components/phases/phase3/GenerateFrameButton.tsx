'use client'

import { Loader2, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'

interface GenerateFrameButtonProps {
  onClick: () => void
  disabled?: boolean
  isGenerating?: boolean
  size?: 'sm' | 'md'
  className?: string
  label?: string
  ariaLabel?: string
}

export function GenerateFrameButton({
  onClick,
  disabled = false,
  isGenerating = false,
  size = 'sm',
  className,
  label = 'Generate',
  ariaLabel,
}: GenerateFrameButtonProps): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled || isGenerating}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-design/40 bg-design/10 text-design transition hover:bg-design/15 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm',
        className,
      )}
    >
      {isGenerating ? <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" /> : <Sparkles size={size === 'sm' ? 12 : 14} />}
      {label}
    </button>
  )
}
