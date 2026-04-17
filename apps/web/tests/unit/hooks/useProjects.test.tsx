import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useCreateProject, useDeleteProject, useProjects, useStarProject } from '@/hooks/useProjects'

const apiMocks = vi.hoisted(() => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  starProject: vi.fn(),
  updateProject: vi.fn(),
}))

vi.mock('@/api/projects.api', () => ({
  getProjects: (...args: unknown[]) => apiMocks.getProjects(...args),
  createProject: (...args: unknown[]) => apiMocks.createProject(...args),
  deleteProject: (...args: unknown[]) => apiMocks.deleteProject(...args),
  starProject: (...args: unknown[]) => apiMocks.starProject(...args),
  updateProject: (...args: unknown[]) => apiMocks.updateProject(...args),
}))

function wrapperFactory(client: QueryClient): React.ComponentType<{ children: React.ReactNode }> {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useProjects hooks', () => {
  it('fetches projects list', async () => {
    const client = new QueryClient()
    apiMocks.getProjects.mockResolvedValueOnce({ projects: [{ id: '1' }], total: 1, page: 1, limit: 20 })
    const { result } = renderHook(() => useProjects(), { wrapper: wrapperFactory(client) })
    await waitFor(() => expect(result.current.data?.projects).toHaveLength(1))
  })

  it('useCreateProject calls POST', async () => {
    const client = new QueryClient()
    apiMocks.createProject.mockResolvedValueOnce({ id: '1' })
    const { result } = renderHook(() => useCreateProject(), { wrapper: wrapperFactory(client) })
    await result.current.mutateAsync({ name: 'n', emoji: '🚀', buildMode: 'copilot' })
    expect(apiMocks.createProject).toHaveBeenCalled()
  })

  it('useStarProject optimistic update and rollback', async () => {
    const client = new QueryClient()
    client.setQueryData(['projects', {}], { projects: [{ id: '1', isStarred: false }], total: 1, page: 1, limit: 20 })
    apiMocks.starProject.mockRejectedValueOnce(new Error('failed'))
    const { result } = renderHook(() => useStarProject(), { wrapper: wrapperFactory(client) })
    result.current.mutate({ id: '1', starred: true })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const cached = client.getQueryData<{ projects: Array<{ isStarred: boolean }> }>(['projects', {}])
    expect(cached?.projects[0]?.isStarred).toBe(false)
  })

  it('useDeleteProject removes project immediately', async () => {
    const client = new QueryClient()
    client.setQueryData(['projects', {}], {
      projects: [{ id: '1' }, { id: '2' }],
      total: 2,
      page: 1,
      limit: 20,
    })
    apiMocks.deleteProject.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useDeleteProject(), { wrapper: wrapperFactory(client) })
    await result.current.mutateAsync('1')
    const cached = client.getQueryData<{ projects: Array<{ id: string }> }>(['projects', {}])
    expect(cached?.projects).toHaveLength(1)
  })
})
