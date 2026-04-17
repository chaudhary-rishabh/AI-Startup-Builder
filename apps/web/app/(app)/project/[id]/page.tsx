'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { getPhaseRoute } from '@/api/projects.api'
import { useProject } from '@/hooks/useProject'

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }): JSX.Element {
  const resolvedParams = use(params)
  const router = useRouter()
  const { data: project } = useProject(resolvedParams.id)

  useEffect(() => {
    if (!project) return
    router.replace(getPhaseRoute(project.id, project.currentPhase))
  }, [project, router])

  return <div className="shimmer h-full" />
}
