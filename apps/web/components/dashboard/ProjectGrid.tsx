'use client'

import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { NewProjectModal } from '@/components/dashboard/NewProjectModal'
import { useProjects } from '@/hooks/useProjects'

type SortMode = 'recent' | 'name' | 'phase'

export function ProjectGrid({ sortMode = 'recent' }: { sortMode?: SortMode }): JSX.Element {
  const { data, isLoading } = useProjects({ status: 'active' })
  const [open, setOpen] = useState(false)

  const projects = useMemo(() => {
    const rows = [...(data?.projects ?? [])]
    if (sortMode === 'name') {
      rows.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortMode === 'phase') {
      rows.sort((a, b) => b.currentPhase - a.currentPhase)
    } else {
      rows.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    }
    return rows
  }, [data?.projects, sortMode])

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="shimmer h-52 rounded-card" />
        ))}
      </div>
    )
  }

  if (!projects.length) {
    return (
      <>
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-card border border-dashed border-muted bg-card p-6 text-center">
          <p className="text-5xl">🚀</p>
          <h3 className="mt-4 font-display text-[18px] font-bold text-heading">Start your first project</h3>
          <p className="mt-2 text-sm text-muted">Your ideas become products here.</p>
          <button
            type="button"
            className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setOpen(true)}
          >
            Create Project →
          </button>
        </div>
        <NewProjectModal open={open} onClose={() => setOpen(false)} />
      </>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[220px] flex-col items-center justify-center rounded-card border-2 border-dashed border-muted text-muted transition hover:border-brand hover:bg-divider"
        >
          <Plus size={22} />
          <span className="mt-2 text-sm">New Project</span>
        </button>
      </div>
      <NewProjectModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
