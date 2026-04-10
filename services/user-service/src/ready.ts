import { sql } from 'drizzle-orm'
import type { Context } from 'hono'

import { getDb } from './lib/db.js'
import { getRedis } from './services/redis.service.js'

export async function readyHandler(c: Context): Promise<Response> {
  try {
    await getDb().execute(sql`select 1`)
    const pong = await getRedis().ping()
    if (pong !== 'PONG') {
      return c.json({ status: 'not_ready', service: 'user-service', redis: false }, 503)
    }
    return c.json({ status: 'ready', service: 'user-service' })
  } catch {
    return c.json({ status: 'not_ready', service: 'user-service' }, 503)
  }
}
