'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

import { advancePhase, getPhaseRoute } from '@/api/projects.api'

const phaseLabels = ['Validate', 'Plan', 'Design', 'Build', 'Deploy', 'Growth']

interface TopBarProps {
  projectId: string
  projectName: string
  currentPhase: number
  phaseProgress: Record<string, 'complete' | 'active' | 'locked'>
}

export function TopBar({ projectId, projectName, currentPhase, phaseProgress }: TopBarProps): JSX.Element {
  const router = useRouter()
  const isCurrentComplete = phaseProgress[String(currentPhase)] === 'complete'

  const handleAdvance = async (): Promise<void> => {
    const result = await advancePhase(projectId, Math.min(6, currentPhase + 1))
    router.push(getPhaseRoute(projectId, result.currentPhase))
  }

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-divider bg-card px-4">
      <nav className="flex items-center gap-2 text-xs text-muted">
        <Link href="/dashboard" className="text-heading">
          Dashboard
        </Link>
        <span>/</span>
        <span className="max-w-[24ch] truncate text-heading">{projectName}</span>
      </nav>

      <div className="flex items-center gap-2">
        {phaseLabels.map((label, index) => {
          const phaseNumber = index + 1
          const complete = phaseNumber < currentPhase
          const active = phaseNumber === currentPhase
          return (
            <button
              key={label}
              type="button"
              title={label}
              className={`flex h-3 w-3 items-center justify-center rounded-full ${
                complete
                  ? 'bg-success'
                  : active
                    ? 'bg-brand shadow-[0_0_0_3px_rgba(139,111,71,0.2)]'
                    : 'border border-muted bg-divider'
              }`}
              onClick={() => {
                if (complete) {
                  router.push(getPhaseRoute(projectId, phaseNumber))
                }
              }}
            >
              {complete ? <CheckCircle2 className="h-2 w-2 text-white" /> : null}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!isCurrentComplete}
        onClick={() => void handleAdvance()}
        title={isCurrentComplete ? 'Move to next phase' : 'Complete this phase first'}
        className={`h-9 rounded-md border px-3 text-xs font-semibold ${
          isCurrentComplete
            ? 'border-brand bg-brand text-white'
            : 'cursor-not-allowed border-divider bg-output text-muted'
        }`}
      >
        Next Phase →
      </button>
    </header>
  )
}
