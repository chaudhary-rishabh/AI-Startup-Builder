import { Hono } from 'hono'

import { env } from '../config/env.js'
import { ok } from '../lib/response.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { pineconeService } from '../services/pinecone.service.js'

const admin = new Hono()

admin.use('*', requireAuth)
admin.use('*', requireAdmin)

admin.get('/rag/admin/pinecone-stats', async (c) => {
  const namespace = c.req.query('namespace')
  if (namespace) {
    const stats = await pineconeService.getNamespaceStats(namespace)
    return ok(c, { namespace, stats })
  }
  return ok(c, { indexName: env.PINECONE_INDEX_NAME, message: 'Pass ?namespace=user_<id>' })
})

export default admin
