import { Hono } from 'hono'

import {
  getNamespaceStats,
  pineconeNamespaceForUser,
} from '../db/queries/ragNamespaces.queries.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { pineconeService } from '../services/pinecone.service.js'

const ns = new Hono()

ns.use('*', requireAuth)

ns.get('/rag/namespace/stats', async (c) => {
  const userId = c.get('userId')
  const row = await getNamespaceStats(userId)
  const namespace = pineconeNamespaceForUser(userId)
  const pine = await pineconeService.getNamespaceStats(namespace)
  return ok(c, { db: row ?? null, pinecone: pine })
})

export default ns
