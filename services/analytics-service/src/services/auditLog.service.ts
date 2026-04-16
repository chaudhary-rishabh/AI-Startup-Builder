import { findAuditLogs, insertAuditLog } from '../db/queries/auditLogs.queries.js'
import { logger } from '../lib/logger.js'

import type { AuditLog } from '../db/schema.js'

export async function writeAuditEntry(data: {
  adminId: string
  action: string
  targetType: string
  targetId?: string
  beforeState?: Record<string, unknown>
  afterState?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}): Promise<AuditLog | null> {
  try {
    return await insertAuditLog({
      adminId: data.adminId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId ?? null,
      beforeState: data.beforeState ?? null,
      afterState: data.afterState ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    })
  } catch (error) {
    logger.error('writeAuditEntry failed', { error, action: data.action, adminId: data.adminId })
    return null
  }
}

export async function queryAuditLogs(params: {
  adminId?: string
  action?: string
  targetType?: string
  targetId?: string
  fromDate?: Date
  toDate?: Date
  page: number
  limit: number
}): Promise<{ data: AuditLog[]; total: number }> {
  return findAuditLogs(params)
}
