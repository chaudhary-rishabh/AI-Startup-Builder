import { Hono } from 'hono'
import { count, sql } from 'drizzle-orm'
import { z } from 'zod'

import { env } from '../config/env.js'
import { ragDocuments } from '../db/schema.js'
import { getDb } from '../lib/db.js'
import { accepted, err, ok } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { logger } from '../lib/logger.js'
import { pineconeService } from '../services/pinecone.service.js'
import { forceReindex } from '../services/reindex.service.js'

const admin = new Hono()

admin.use('*', requireAuth)
admin.use('*', requireAdmin)

async function rateLimitOk(
  userId: string,
  bucket: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  const redis = getRedis()
  const k = `rag:rl:${bucket}:${userId}`
  const n = await redis.incr(k)
  if (n === 1) await redis.expire(k, windowSec)
  return n <= max
}

const userIdParamsSchema = z.object({
  userId: z.string().uuid(),
})

admin.post('/rag/admin/reindex/:userId', async (c) => {
  const actorId = c.get('userId')
  const role = c.get('userRole')
  if (!(await rateLimitOk(actorId, 'rag-admin-reindex', 3, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many reindex requests. Try again later.')
  }
  if (role !== 'super_admin') {
    return err(c, 403, 'FORBIDDEN', 'Super admin access required')
  }

  const parsed = userIdParamsSchema.safeParse({ userId: c.req.param('userId') })
  if (!parsed.success) {
    return err(c, 422, 'VALIDATION_ERROR', 'Invalid userId')
  }

  const targetUserId = parsed.data.userId
  const db = getDb()
  let userExists = false
  try {
    const existsRes = await db.execute(
      sql`SELECT id FROM auth.users WHERE id = ${targetUserId} LIMIT 1`,
    )
    const rows = ((existsRes as unknown) as { rows?: Array<{ id: string }> }).rows ?? []
    userExists = rows.length > 0
  } catch (error) {
    logger.warn('Unable to verify auth.users existence from rag-service DB context', { error })
    userExists = true
  }
  if (!userExists) {
    return err(c, 404, 'USER_NOT_FOUND', 'User not found')
  }

  const result = await forceReindex(targetUserId)
  return accepted(c, {
    userId: targetUserId,
    documentsQueued: result.documentsQueued,
    estimatedMs: result.documentsQueued * 15_000,
    message: `Reindex started for ${result.documentsQueued} documents.`,
  })
})

admin.get('/rag/admin/stats', async (c) => {
  const userId = c.get('userId')
  if (!(await rateLimitOk(userId, 'rag-admin-stats', 10, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many stats requests. Try again later.')
  }

  const db = getDb()
  const stats = await db
    .select({
      totalDocuments: count(ragDocuments.id),
      indexedDocuments:
        sql<number>`count(case when ${ragDocuments.status} = 'indexed' then 1 end)`.mapWith(
          Number,
        ),
      failedDocuments:
        sql<number>`count(case when ${ragDocuments.status} = 'failed' then 1 end)`.mapWith(Number),
      processingDocuments:
        sql<number>`count(case when ${ragDocuments.status} = 'processing' then 1 end)`.mapWith(
          Number,
        ),
      totalUsers: sql<number>`count(distinct ${ragDocuments.userId})`.mapWith(Number),
    })
    .from(ragDocuments)

  const pineconeHealth = (await pineconeService.getNamespaceStats('admin_shared'))
    ? 'healthy'
    : 'unavailable'

  return ok(c, {
    documents: stats[0] ?? {
      totalDocuments: 0,
      indexedDocuments: 0,
      failedDocuments: 0,
      processingDocuments: 0,
      totalUsers: 0,
    },
    pineconeStatus: pineconeHealth,
    embeddingModel: 'text-embedding-3-large',
    rerankModel: 'rerank-english-v3.0',
    chunkConfig: {
      chunkSize: env.CHUNK_SIZE_TOKENS,
      overlap: env.CHUNK_OVERLAP_TOKENS,
      hybridAlpha: env.HYBRID_ALPHA,
    },
  })
})

export default admin
