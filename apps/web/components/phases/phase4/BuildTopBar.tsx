'use client'

import { Download, ExternalLink, Play, Square } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { exportProjectZip } from '@/api/files.api'
import { usePhaseAdvance } from '@/hooks/usePhaseAdvance'
import type { BuildMode } from '@/types'

interface BuildTopBarProps {
  projectId: string
  buildMode: BuildMode
  activePath: string | null
  activeLanguage: string
  allAgentsComplete: boolean
  onStop: (() => Promise<void>) | null
  isAgentRunning: boolean
}

export function BuildTopBar({
  projectId,
  buildMode,
  activePath,
  activeLanguage,
  allAgentsComplete,
  onStop,
  isAgentRunning,
}: BuildTopBarProps): JSX.Element {
  const [downloading, setDownloading] = useState(false)
  const phaseAdvance = usePhaseAdvance({
    projectId,
    currentPhase: 4,
    buildMode,
    allAgentsComplete,
    copilotAnswered: true,
  })

  const segments = activePath ? activePath.split('/').filter(Boolean) : []

  const handleDownload = async (): Promise<void> => {
    setDownloading(true)
    try {
      const blob = await exportProjectZip(projectId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectId}-phase4.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-3">
      <div className="flex min-w-0 flex-1 items-center gap-1 text-xs">
        {segments.length ? (
          <div className="flex min-w-0 items-center truncate text-slate-600">
            {segments.map((seg, i) => (
              <span key={`${seg}-${i}`} className="flex items-center">
                {i > 0 ? <span className="px-0.5">/</span> : null}
                <span className={i === segments.length - 1 ? 'font-medium text-slate-200' : ''}>{seg}</span>
              </span>
            ))}
            <span className="ml-2 rounded bg-[#0D9488]/20 px-1.5 py-0.5 text-[10px] font-medium capitalize text-teal-300">
              {activeLanguage === 'typescript' ? 'TypeScript' : activeLanguage}
            </span>
          </div>
        ) : (
          <span className="text-slate-500">No file selected</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-8 items-center gap-1 rounded border border-[#0D9488] px-2 text-xs text-[#0D9488] hover:bg-green-500/10"
          onClick={() => toast.message('Run environment not available in preview')}
        >
          <Play size={14} /> Run
        </button>
        <button
          type="button"
          disabled={!isAgentRunning || !onStop}
          className="flex h-8 items-center gap-1 rounded border border-red-500/50 px-2 text-xs text-red-400 disabled:opacity-40"
          onClick={() => void onStop?.()}
        >
          <Square size={14} /> Stop
        </button>
        <button
          type="button"
          disabled={downloading}
          className="flex h-8 items-center gap-1 rounded border border-[#0D9488] px-2 text-xs text-[#0D9488] disabled:opacity-50"
          onClick={() => void handleDownload()}
        >
          <Download size={14} /> {downloading ? '…' : 'Download'}
        </button>
        <button
          type="button"
          disabled={!allAgentsComplete}
          className="flex h-8 items-center gap-1 rounded border border-[#0D9488] px-2 text-xs text-[#0D9488] disabled:opacity-40"
          onClick={() => toast.message('Preview available after deployment in Phase 5')}
        >
          <ExternalLink size={14} /> Preview
        </button>
      </div>

      <div className="flex w-[200px] shrink-0 justify-end">
        <button
          type="button"
          disabled={!phaseAdvance.canAdvance || phaseAdvance.isAdvancing}
          title={!phaseAdvance.canAdvance ? 'Generate all code first' : undefined}
          className="h-9 rounded-md bg-[#0D9488] px-3 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void phaseAdvance.advance()}
        >
          Next Phase →
        </button>
      </div>
    </div>
  )
}
