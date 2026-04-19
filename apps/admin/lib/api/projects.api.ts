import api from '@/lib/axios'
import type { AdminProject, AdminProjectFilterParams } from '@/types'
import { unwrap } from '@/lib/api/envelope'

export interface PaginatedProjects {
  projects: AdminProject[]
  total: number
  page: number
  totalPages: number
}

function buildProjectParams(
  params: Partial<AdminProjectFilterParams>,
): Record<string, string | number | undefined> {
  const p: Record<string, string | number | undefined> = {}
  if (params.search) p.search = params.search
  if (params.phase != null && params.phase !== 'all') p.phase = params.phase
  if (params.status && params.status !== 'all') p.status = params.status
  if (params.buildMode && params.buildMode !== 'all') p.buildMode = params.buildMode
  if (params.page != null) p.page = params.page
  if (params.limit != null) p.limit = params.limit
  if (params.sortBy) p.sortBy = params.sortBy
  if (params.sortOrder) p.sortOrder = params.sortOrder
  return p
}

export async function listAllProjects(
  params: Partial<AdminProjectFilterParams>,
): Promise<PaginatedProjects> {
  const body: unknown = await api.get('/admin/projects', {
    params: buildProjectParams(params),
  })
  return unwrap<PaginatedProjects>(body)
}

export async function getAdminProject(projectId: string): Promise<AdminProject> {
  const body: unknown = await api.get(`/admin/projects/${projectId}`)
  return unwrap<AdminProject>(body)
}
