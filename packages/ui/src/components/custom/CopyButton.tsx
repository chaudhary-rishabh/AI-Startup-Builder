import { Check, Copy } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'

interface CopyButtonProps {
  text: string
  className?: string
}

/**
 * Icon button that copies `text` to clipboard.
 * Shows a Check icon for 2 seconds after a successful copy, then reverts.
 */
export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — silent fail
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-chip',
        'text-brand-light hover:text-brand-dark hover:bg-background',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        className,
      )}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  )
}
