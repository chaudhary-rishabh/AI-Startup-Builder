import api from '@/lib/axios'
import type { AuditLogEntry, AuditLogFilter } from '@/types'
import { unwrap } from '@/lib/api/envelope'

export interface PaginatedAuditLog {
  logs: AuditLogEntry[]
  total: number
  page: number
  totalPages: number
}

function buildAuditParams(
  params: Partial<AuditLogFilter>,
): Record<string, string | number | undefined> {
  const p: Record<string, string | number | undefined> = {}
  if (params.adminId && params.adminId !== 'all') p.adminId = params.adminId
  if (params.action && params.action !== 'all') p.action = params.action
  if (params.from) p.from = params.from
  if (params.to) p.to = params.to
  if (params.page != null) p.page = params.page
  if (params.limit != null) p.limit = params.limit
  return p
}

export async function getAuditLog(
  params: Partial<AuditLogFilter>,
): Promise<PaginatedAuditLog> {
  const body: unknown = await api.get('/admin/audit', {
    params: buildAuditParams(params),
  })
  return unwrap<PaginatedAuditLog>(body)
}

export async function exportAuditLog(
  params: Partial<AuditLogFilter>,
): Promise<void> {
  const res = (await api.get('/admin/audit/export', {
    params: buildAuditParams(params),
    responseType: 'blob',
  })) as Blob | string
  const blob =
    typeof res === 'string'
      ? new Blob([res], { type: 'text/csv;charset=utf-8' })
      : res
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
