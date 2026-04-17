'use client'

import { useQuery } from '@tanstack/react-query'

import { getProject } from '@/api/projects.api'

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    staleTime: 60_000,
    enabled: !!id,
  })
}
