import { Hono } from 'hono'

import { listRegisteredAgentTypes } from '../agents/registry.js'
import { getRedis } from '../lib/redis.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'

const CACHE_KEY = 'ai:catalog:agent-types:v6'
const CACHE_TTL = 300

const routes = new Hono()
routes.use('*', requireAuth)

routes.get('/agent-types', async (c) => {
  const redis = getRedis()
  try {
    const hit = await redis.get(CACHE_KEY)
    if (hit) {
      return ok(c, JSON.parse(hit) as { agents: string[]; count: number })
    }
  } catch {
    /* ignore */
  }
  const agents = listRegisteredAgentTypes()
  const payload = { agents, count: agents.length }
  try {
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
  return ok(c, payload)
})

export default routes
