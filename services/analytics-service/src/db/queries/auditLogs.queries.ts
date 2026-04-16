import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import { getReadReplica } from '../../lib/readReplica.js'
import { auditLogs } from '../schema.js'

import type { AuditLog, NewAuditLog } from '../schema.js'

export async function insertAuditLog(data: NewAuditLog): Promise<AuditLog> {
  const [row] = await getDb().insert(auditLogs).values(data).returning()
  if (!row) throw new Error('insertAuditLog: insert returned no row')
  return row
}

export async function findAuditLogs(params: {
  adminId?: string
  action?: string
  targetType?: string
  targetId?: string
  fromDate?: Date
  toDate?: Date
  page: number
  limit: number
}): Promise<{ data: AuditLog[]; total: number }> {
  const db = getReadReplica()
  const page = Math.max(1, params.page)
  const limit = Math.min(200, Math.max(1, params.limit))
  const offset = (page - 1) * limit
  const where = [
    ...(params.adminId ? [eq(auditLogs.adminId, params.adminId)] : []),
    ...(params.action ? [eq(auditLogs.action, params.action)] : []),
    ...(params.targetType ? [eq(auditLogs.targetType, params.targetType)] : []),
    ...(params.targetId ? [eq(auditLogs.targetId, params.targetId)] : []),
    ...(params.fromDate ? [gte(auditLogs.createdAt, params.fromDate)] : []),
    ...(params.toDate ? [lte(auditLogs.createdAt, params.toDate)] : []),
  ]

  const data = await db
    .select()
    .from(auditLogs)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalRow] = await db
    .select({ c: count() })
    .from(auditLogs)
    .where(where.length > 0 ? and(...where) : undefined)

  return { data, total: Number(totalRow?.c ?? 0) }
}
