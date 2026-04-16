import { Hono } from 'hono'
import { z } from 'zod'

import { err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getRedis } from '../lib/redis.js'
import { embedSingleText } from '../services/embedder.service.js'
import { pineconeNamespaceForUser } from '../db/queries/ragNamespaces.queries.js'
import { pineconeService } from '../services/pinecone.service.js'

import type { QueryParams } from '../services/pinecone.service.js'
import { createBm25EncoderForDocument } from '../services/bm25Encoder.service.js'
import { runQueryPipeline } from '../services/queryPipeline.service.js'

const query = new Hono()

query.use('*', requireAuth)

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

const ragQueryBodySchema = z.object({
  query: z.string().min(3).max(1000),
  topK: z.number().int().min(1).max(20).default(5),
  filterDocIds: z.array(z.string().uuid()).optional(),
  useReranking: z.boolean().default(true),
  alpha: z.number().min(0).max(1).default(0.8),
})

query.post('/rag/query', async (c) => {
  const userId = c.get('userId')
  if (!(await rateLimitOk(userId, 'rag-query', 10, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many queries. Try again later.')
  }

  const json = (await c.req.json().catch(() => null)) as unknown
  const rawQ = json && typeof json === 'object' && json !== null && 'query' in json ? (json as { query?: unknown }).query : undefined
  if (typeof rawQ === 'string' && rawQ.length > 0 && rawQ.length < 3) {
    return err(c, 400, 'VALIDATION_ERROR', 'Query must be at least 3 characters')
  }

  const parsed = ragQueryBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(c, 422, 'VALIDATION_ERROR', 'Invalid request body')
  }

  const body = parsed.data
  const result = await runQueryPipeline({
    userId,
    query: body.query,
    topNRerank: body.topK,
    useReranking: body.useReranking,
    alpha: body.alpha,
    ...(body.filterDocIds !== undefined ? { filterDocIds: body.filterDocIds } : {}),
  })

  return ok(c, {
    query: result.query,
    chunks: result.chunks.map((ch) => ({
      chunkId: ch.chunkId,
      text: ch.text,
      contextualPrefix: ch.contextualPrefix,
      originalText: ch.originalText,
      score: ch.score,
      docId: ch.docId,
      docName: ch.docName,
      chunkIndex: ch.chunkIndex,
    })),
    totalFound: result.finalResultCount,
    cacheHit: result.cacheHit,
    processingMs: result.processingMs,
    debug: {
      denseResultCount: result.denseResultCount,
      bm25ResultCount: result.bm25ResultCount,
      fusedResultCount: result.fusedResultCount,
      rerankerUsed: result.rerankerUsed,
    },
  })
})

const bm25QueryBodySchema = z.object({
  query: z.string().min(1).max(1000),
  topK: z.number().int().min(1).max(20).default(20),
  filterDocIds: z.array(z.string().uuid()).optional(),
})

query.post('/rag/bm25-query', async (c) => {
  const userId = c.get('userId')
  if (!(await rateLimitOk(userId, 'rag-bm25-query', 10, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many queries. Try again later.')
  }

  const json = (await c.req.json().catch(() => null)) as unknown
  const parsed = bm25QueryBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(c, 422, 'VALIDATION_ERROR', 'Invalid request body')
  }

  const body = parsed.data
  const namespace = pineconeNamespaceForUser(userId)
  const queryEmbedding = await embedSingleText(body.query)

  const enc = createBm25EncoderForDocument()
  await enc.fitAndEncode([body.query])
  const sparseVec = await enc.encodeQuery(body.query)

  if (sparseVec.indices.length === 0) {
    return ok(c, {
      query: body.query,
      chunks: [],
      totalFound: 0,
    })
  }

  const filter: Record<string, unknown> | undefined =
    body.filterDocIds && body.filterDocIds.length > 0
      ? { docId: { $in: body.filterDocIds } }
      : undefined

  const qParams: QueryParams = {
    namespace,
    vector: queryEmbedding,
    sparseVector: sparseVec,
    topK: body.topK,
    alpha: 0.05,
    includeMetadata: true,
  }
  if (filter) qParams.filter = filter
  const results = await pineconeService.queryHybrid(qParams)

  return ok(c, {
    query: body.query,
    chunks: results.map((r) => ({
      chunkId: r.id,
      text: (r.metadata.enrichedText as string) || (r.metadata.originalText as string),
      contextualPrefix: r.metadata.contextualPrefix as string,
      originalText: r.metadata.originalText as string,
      score: r.score,
      docId: r.metadata.docId as string,
      docName: r.metadata.filename as string,
      chunkIndex: r.metadata.chunkIndex as number,
    })),
    totalFound: results.length,
  })
})

export default query
