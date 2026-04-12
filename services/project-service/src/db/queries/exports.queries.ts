import { and, eq } from 'drizzle-orm'

import { projectExports } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { NewProjectExport, ProjectExport } from '../schema.js'

export async function createExportJob(data: NewProjectExport): Promise<ProjectExport> {
  const db = getDb()
  const [row] = await db.insert(projectExports).values(data).returning()
  if (!row) throw new Error('createExportJob: insert returned no row')
  return row
}

export async function findExportByJobId(
  jobId: string,
  userId: string,
): Promise<ProjectExport | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(projectExports)
    .where(and(eq(projectExports.jobId, jobId), eq(projectExports.userId, userId)))
    .limit(1)
  return row
}

export type ExportStatusUpdate = {
  status: 'processing' | 'complete' | 'failed'
  progress?: number
  s3Key?: string
  downloadUrl?: string
  expiresAt?: Date
  fileSizeBytes?: number
  errorMessage?: string
}

export async function updateExportStatus(
  jobId: string,
  data: ExportStatusUpdate,
): Promise<ProjectExport | undefined> {
  const db = getDb()
  const set: {
    updatedAt: Date
    status: ExportStatusUpdate['status']
    progress?: number
    s3Key?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | null
    fileSizeBytes?: number | null
    errorMessage?: string | null
  } = { updatedAt: new Date(), status: data.status }
  if (data.progress !== undefined) set.progress = data.progress
  if (data.s3Key !== undefined) set.s3Key = data.s3Key
  if (data.downloadUrl !== undefined) set.downloadUrl = data.downloadUrl
  if (data.expiresAt !== undefined) set.expiresAt = data.expiresAt
  if (data.fileSizeBytes !== undefined) set.fileSizeBytes = data.fileSizeBytes
  if (data.errorMessage !== undefined) set.errorMessage = data.errorMessage

  const [row] = await db
    .update(projectExports)
    .set(set)
    .where(eq(projectExports.jobId, jobId))
    .returning()
  return row
}
