'use client'

import { useRouter } from 'next/navigation'

import { getPhaseRoute } from '@/api/projects.api'
import { useProjects } from '@/hooks/useProjects'

export function StarredRow(): JSX.Element | null {
  const router = useRouter()
  const { data } = useProjects({ starred: true })
  const projects = data?.projects ?? []

  if (!projects.length) {
    return null
  }

  return (
    <div className="relative overflow-x-auto pb-2">
      <div className="flex gap-4">
        {projects.map((project) => (
          <article key={project.id} className="min-w-[200px] max-w-[200px] rounded-card bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-heading">
                  {project.emoji} {project.name}
                </p>
              </div>
              <span className="rounded-chip bg-divider px-2 py-0.5 text-[10px] text-heading">P{project.currentPhase}</span>
            </div>
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-brand"
              onClick={() => router.push(getPhaseRoute(project.id, project.currentPhase))}
            >
              Continue →
            </button>
          </article>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bg to-transparent" />
    </div>
  )
}
