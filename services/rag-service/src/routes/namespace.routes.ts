import { Hono } from 'hono'
import { z } from 'zod'

import {
  getNamespaceStats,
  pineconeNamespaceForUser,
  updateNamespaceStats,
} from '../db/queries/ragNamespaces.queries.js'
import { listDocumentsByUserForDeletion } from '../db/queries/ragDocuments.queries.js'
import { deleteDocument } from '../db/queries/ragDocuments.queries.js'
import { env } from '../config/env.js'
import { err, ok } from '../lib/response.js'
import { deleteUserRagS3Prefix } from '../lib/s3.js'
import { getRedis } from '../lib/redis.js'
import { logger } from '../lib/logger.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { pineconeService } from '../services/pinecone.service.js'

const ns = new Hono()

ns.use('*', requireAuth)

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

function docLimitForPlan(plan: string): number {
  const p = plan.toLowerCase()
  if (p === 'enterprise') return env.MAX_DOCS_ENTERPRISE_PLAN
  if (p === 'pro') return env.MAX_DOCS_PRO_PLAN
  return env.MAX_DOCS_FREE_PLAN
}

ns.get('/rag/namespace', async (c) => {
  const userId = c.get('userId')
  const plan = c.get('userPlan')
  if (!(await rateLimitOk(userId, 'rag-namespace-get', 60, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }

  const redis = getRedis()
  const cacheKey = `rag:ns:${userId}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    try {
      return ok(c, JSON.parse(cached) as Record<string, unknown>)
    } catch {
      /* fall through */
    }
  }

  const nsStats = await getNamespaceStats(userId)
  const namespace = pineconeNamespaceForUser(userId)
  const pineconeStats = await pineconeService.getNamespaceStats(namespace)
  const docLimit = docLimitForPlan(plan)
  const docCount = nsStats?.docCount ?? 0
  const docUsagePct = docLimit > 0 ? Math.round((docCount / docLimit) * 100) : 0

  const payload = {
    namespace,
    docCount,
    docLimit,
    totalChunks: nsStats?.totalChunks ?? 0,
    vectorCount: pineconeStats?.vectorCount ?? 0,
    docUsagePercent: docUsagePct,
    lastIndexedAt: nsStats?.lastIndexedAt ?? null,
    status: docCount > 0 ? 'active' : 'empty',
  }

  await redis.setex(cacheKey, 60, JSON.stringify(payload))
  return ok(c, payload)
})

const deleteNsBodySchema = z.object({
  confirm: z.literal('DELETE_ALL'),
})

ns.delete('/rag/namespace', async (c) => {
  const userId = c.get('userId')
  if (!(await rateLimitOk(userId, 'rag-namespace-delete', 1, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many delete requests')
  }

  const json = (await c.req.json().catch(() => null)) as unknown
  const parsed = deleteNsBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(c, 400, 'CONFIRMATION_REQUIRED', 'Send { "confirm": "DELETE_ALL" } to confirm deletion.')
  }

  const namespace = pineconeNamespaceForUser(userId)
  const nsStats = await getNamespaceStats(userId)

  try {
    await pineconeService.deleteNamespace(namespace)
  } catch (e) {
    logger.error('Pinecone namespace delete failed', { e, userId })
  }

  void deleteUserRagS3Prefix(userId).catch((err) => logger.error('S3 user prefix delete failed', { err }))

  const docs = await listDocumentsByUserForDeletion(userId)
  for (const doc of docs) {
    await deleteDocument(doc.id, userId)
  }

  await updateNamespaceStats(userId, {
    docCountDelta: -(nsStats?.docCount ?? 0),
    chunkCountDelta: -(nsStats?.totalChunks ?? 0),
  })

  const redis = getRedis()
  const keys = await redis.keys(`rag:query:${userId}:*`)
  const batch = 500
  for (let i = 0; i < keys.length; i += batch) {
    const slice = keys.slice(i, i + batch)
    if (slice.length > 0) await redis.del(...slice)
  }
  await redis.del(`rag:ns:${userId}`)

  return ok(c, {
    deleted: true,
    docsDeleted: docs.length,
    message: 'Knowledge base cleared.',
  })
})

ns.get('/rag/namespace/stats', async (c) => {
  const userId = c.get('userId')
  const row = await getNamespaceStats(userId)
  const namespace = pineconeNamespaceForUser(userId)
  const pine = await pineconeService.getNamespaceStats(namespace)
  return ok(c, { db: row ?? null, pinecone: pine })
})

export default ns
