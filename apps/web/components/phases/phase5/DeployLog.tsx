'use client'

import { Terminal } from '@/components/phases/phase4/Terminal'
import type { TerminalLine } from '@/types'

interface DeployLogProps {
  lines: TerminalLine[]
  onClear: () => void
}

export function DeployLog({ lines, onClear }: DeployLogProps): JSX.Element {
  return (
    <div className="shrink-0 border-t border-slate-700 bg-slate-950">
      <Terminal lines={lines} onClear={onClear} />
    </div>
  )
}
