import api from '@/lib/axios'
import type {
  AdminUserDetail,
  AdminUserInvoice,
  AdminUserLoginEvent,
  AdminUserProject,
  AdminUserRow,
  UserFilterParams,
} from '@/types'
import { unwrap } from '@/lib/api/envelope'

export interface PaginatedUsers {
  users: AdminUserRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function buildUserListParams(
  params: Partial<UserFilterParams>,
): Record<string, string | number | undefined> {
  const p: Record<string, string | number | undefined> = {}
  if (params.search) p.search = params.search
  if (params.plan && params.plan !== 'all') p.plan = params.plan
  if (params.status && params.status !== 'all') p.status = params.status
  if (params.dateFrom) p.dateFrom = params.dateFrom
  if (params.dateTo) p.dateTo = params.dateTo
  if (params.page != null) p.page = params.page
  if (params.limit != null) p.limit = params.limit
  if (params.sortBy) p.sortBy = params.sortBy
  if (params.sortOrder) p.sortOrder = params.sortOrder
  return p
}

export async function listUsers(
  params: Partial<UserFilterParams>,
): Promise<PaginatedUsers> {
  const body: unknown = await api.get('/admin/users', {
    params: buildUserListParams(params),
  })
  return unwrap<PaginatedUsers>(body)
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail> {
  const body: unknown = await api.get(`/admin/users/${userId}`)
  return unwrap<AdminUserDetail>(body)
}

export async function getUserProjects(
  userId: string,
): Promise<AdminUserProject[]> {
  const body: unknown = await api.get(`/admin/users/${userId}/projects`)
  return unwrap<AdminUserProject[]>(body)
}

export async function getUserLoginHistory(
  userId: string,
): Promise<AdminUserLoginEvent[]> {
  const body: unknown = await api.get(`/admin/users/${userId}/login-history`)
  return unwrap<AdminUserLoginEvent[]>(body)
}

export async function getUserInvoices(
  userId: string,
): Promise<AdminUserInvoice[]> {
  const body: unknown = await api.get(`/admin/users/${userId}/invoices`)
  return unwrap<AdminUserInvoice[]>(body)
}

export async function suspendUser(userId: string, reason: string): Promise<void> {
  const body: unknown = await api.post(`/admin/users/${userId}/suspend`, {
    reason,
  })
  unwrap<Record<string, never>>(body)
}

export async function reactivateUser(userId: string): Promise<void> {
  const body: unknown = await api.post(`/admin/users/${userId}/reactivate`, {})
  unwrap<Record<string, never>>(body)
}

export async function changeUserPlan(
  userId: string,
  plan: string,
  note: string,
): Promise<void> {
  const body: unknown = await api.patch(`/admin/users/${userId}/plan`, {
    plan,
    note,
  })
  unwrap<Record<string, never>>(body)
}

export async function updateUserNotes(
  userId: string,
  notes: string,
): Promise<void> {
  const body: unknown = await api.patch(`/admin/users/${userId}/notes`, {
    notes,
  })
  unwrap<Record<string, never>>(body)
}

export async function impersonateUser(
  userId: string,
): Promise<{ impersonateUrl: string }> {
  const body: unknown = await api.post(`/admin/users/${userId}/impersonate`, {})
  return unwrap<{ impersonateUrl: string }>(body)
}

export async function exportUsers(
  params: Partial<UserFilterParams>,
): Promise<void> {
  const res = (await api.get('/admin/users/export', {
    params: buildUserListParams(params),
    responseType: 'blob',
  })) as Blob | string
  const blob =
    typeof res === 'string'
      ? new Blob([res], { type: 'text/csv;charset=utf-8' })
      : res
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function bulkSuspendUsers(userIds: string[]): Promise<void> {
  const body: unknown = await api.post('/admin/users/bulk-suspend', { userIds })
  unwrap<{ suspended?: number }>(body)
}
