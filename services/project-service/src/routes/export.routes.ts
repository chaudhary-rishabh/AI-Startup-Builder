import { ExportProjectSchema } from '@repo/validators'
import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'

import * as exportsQueries from '../db/queries/exports.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'
import { publishProjectExportRequested } from '../events/publisher.js'
import { exportQueue } from '../queues/export.queue.js'
import { accepted, err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getRedis } from '../services/redis.service.js'

const routes = new Hono()

routes.use('*', requireAuth)

routes.post('/:id/export', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return err(c, 422, 'VALIDATION_ERROR', 'Invalid JSON body')
  }
  const parsed = ExportProjectSchema.safeParse(raw)
  if (!parsed.success) {
    return err(c, 422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid export request')
  }
  const body = parsed.data

  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }

  const redis = getRedis()
  const key = `export:ratelimit:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, 60)
  if (n > 3) {
    return err(c, 429, 'RATE_LIMITED', 'Too many export requests. Try again in a minute.')
  }

  const jobId = randomUUID()
  const includePhases = body.includePhases ?? [1, 2, 3, 4, 5, 6]

  await exportsQueries.createExportJob({
    jobId,
    projectId: id,
    userId,
    format: body.format,
    includePhases,
    status: 'queued',
  })

  await exportQueue.add(
    'export',
    {
      jobId,
      projectId: id,
      userId,
      format: body.format,
      includePhases,
    },
    { jobId },
  )

  await publishProjectExportRequested(id, body.format, jobId, includePhases)

  return accepted(c, {
    jobId,
    status: 'queued' as const,
    format: body.format,
    estimatedMs: body.format === 'zip' ? 5000 : 15_000,
    pollUrl: `/projects/${id}/export/${jobId}`,
  })
})

routes.get('/:id/export/:jobId', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const jobId = c.req.param('jobId')

  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }

  const row = await exportsQueries.findExportByJobId(jobId, userId)
  if (!row) {
    return err(c, 404, 'EXPORT_JOB_NOT_FOUND', 'Export job not found')
  }

  const complete = row.status === 'complete'
  const failed = row.status === 'failed'

  return ok(c, {
    jobId: row.jobId,
    status: row.status,
    format: row.format,
    progress: row.progress,
    downloadUrl: complete ? row.downloadUrl : null,
    fileSizeBytes: complete ? row.fileSizeBytes : null,
    expiresAt:
      complete && row.expiresAt
        ? row.expiresAt instanceof Date
          ? row.expiresAt.toISOString()
          : row.expiresAt
        : null,
    errorMessage: failed ? row.errorMessage : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  })
})

export default routes
