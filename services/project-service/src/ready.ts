import type { Context } from 'hono'

import { projects } from './db/schema.js'
import { getDb } from './lib/db.js'
import { getRedis } from './services/redis.service.js'

export async function readyHandler(c: Context): Promise<Response> {
  try {
    await getDb().select().from(projects).limit(1)
  } catch {
    return c.json({ status: 'unhealthy', db: 'unreachable' }, 503)
  }

  try {
    const pong = await getRedis().ping()
    if (pong !== 'PONG') {
      return c.json({ status: 'unhealthy', redis: 'unreachable' }, 503)
    }
  } catch {
    return c.json({ status: 'unhealthy', redis: 'unreachable' }, 503)
  }

  const timestamp = new Date().toISOString()
  return c.json({
    status: 'healthy',
    service: 'project-service',
    db: 'connected',
    redis: 'connected',
    timestamp,
  })
}
