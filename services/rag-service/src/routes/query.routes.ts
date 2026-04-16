import { Hono } from 'hono'
import { z } from 'zod'

import { env } from '../config/env.js'
import { err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { embedSingleText } from '../services/embedder.service.js'
import { pineconeNamespaceForUser } from '../db/queries/ragNamespaces.queries.js'
import { pineconeService } from '../services/pinecone.service.js'

const query = new Hono()

query.use('*', requireAuth)

const bodySchema = z.object({
  query: z.string().min(1),
  topK: z.coerce.number().min(1).max(100).optional(),
})

query.post('/rag/query', async (c) => {
  const json = (await c.req.json().catch(() => null)) as unknown
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return err(c, 422, 'VALIDATION_ERROR', 'Invalid request body')
  }
  const { query: q, topK } = parsed.data
  const userId = c.get('userId')
  const vector = await embedSingleText(q)
  const matches = await pineconeService.queryHybrid({
    namespace: pineconeNamespaceForUser(userId),
    vector,
    topK: topK ?? env.RETRIEVAL_TOP_K,
  })
  return ok(c, { matches })
})

export default query
