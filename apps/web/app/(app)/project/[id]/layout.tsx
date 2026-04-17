'use client'

import { use, useEffect } from 'react'

import { TopBar } from '@/components/layout/TopBar'
import { useProject } from '@/hooks/useProject'
import { useProjectStore } from '@/store/projectStore'

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}): JSX.Element {
  const resolvedParams = use(params)
  const { data: project, isLoading } = useProject(resolvedParams.id)
  const setActiveProject = useProjectStore((state) => state.setActiveProject)
  const setBuildMode = useProjectStore((state) => state.setBuildMode)

  useEffect(() => {
    if (!project) return
    setActiveProject(project.id, project.currentPhase)
    setBuildMode(project.buildMode)
  }, [project, setActiveProject, setBuildMode])

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="shimmer h-12 rounded-card" />
      </div>
    )
  }

  if (!project) {
    return <div className="p-8 text-error">Project not found</div>
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        projectId={project.id}
        projectName={project.name}
        currentPhase={project.currentPhase}
        phaseProgress={project.phaseProgress}
      />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
