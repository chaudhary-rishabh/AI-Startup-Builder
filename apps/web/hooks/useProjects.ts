'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createProject,
  deleteProject,
  getProjects,
  starProject,
  updateProject,
  type UpdateProjectPayload,
} from '@/api/projects.api'
import type { Project } from '@/types'
import { useUIStore } from '@/store/uiStore'

interface ProjectsResponse {
  projects: Project[]
  total: number
  page: number
  limit: number
}

export function useProjects(params?: { status?: 'active' | 'archived' | 'all'; starred?: boolean }) {
  return useQuery({
    queryKey: ['projects', params ?? {}],
    queryFn: () => getProjects(params),
    staleTime: 30_000,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error: unknown) => {
      const appError = error as { message?: string }
      useUIStore.getState().addToast({
        type: 'error',
        title: 'Failed to create project',
        message: appError.message ?? 'Please try again.',
      })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectPayload }) => updateProject(id, payload),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(['project', updatedProject.id], updatedProject)
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_, deletedId) => {
      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: ProjectsResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          projects: old.projects.filter((project) => project.id !== deletedId),
          total: Math.max(0, old.total - 1),
        }
      })
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useStarProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => starProject(id, starred),
    onMutate: async ({ id, starred }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const previous = queryClient.getQueryData(['projects', {}])

      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: ProjectsResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          projects: old.projects.map((project) =>
            project.id === id ? { ...project, isStarred: starred } : project,
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['projects', {}], ctx.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
