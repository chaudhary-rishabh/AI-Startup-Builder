import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { insertEvent, insertEventsBatch } from '../db/queries/platformEvents.queries.js'
import { logger } from '../lib/logger.js'
import { err, ok } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { getOptionalUserIdFromAuthHeader } from '../middleware/requireAuth.js'

const routes = new Hono()

const BLOCKED_PROPERTY_KEYS = ['password', 'token', 'secret', 'credit_card', 'ssn']

function sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([k]) => !BLOCKED_PROPERTY_KEYS.some((blocked) => k.toLowerCase().includes(blocked)),
    ),
  )
}

async function rateLimitOk(identifier: string, bucket: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedis()
  const key = `analytics:rl:${bucket}:${identifier}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, windowSec)
  return n <= max
}

const eventSchema = z.object({
  eventType: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional().default({}),
  sessionId: z.string().max(100).optional(),
  projectId: z.string().uuid().optional(),
})

routes.post('/events', zValidator('json', eventSchema), async (c) => {
  const userId = await getOptionalUserIdFromAuthHeader(c.req.header('Authorization'))
  const bucketId = userId ?? c.req.header('x-forwarded-for') ?? 'anon'
  if (!(await rateLimitOk(bucketId, 'events', 120, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many events')
  }

  const body = c.req.valid('json')
  const sanitized = sanitizeProperties(body.properties)

  try {
    await insertEvent({
      userId,
      projectId: body.projectId ?? null,
      eventType: body.eventType,
      properties: sanitized,
      sessionId: body.sessionId ?? null,
      createdAt: new Date(),
    })
  } catch (error) {
    logger.error('Event insert failed (non-blocking)', { error, eventType: body.eventType })
  }
  return ok(c, { received: true })
})

const batchSchema = z.object({
  events: z
    .array(
      z.object({
        eventType: z.string().min(1).max(100),
        properties: z.record(z.unknown()).optional().default({}),
        sessionId: z.string().max(100).optional(),
        projectId: z.string().uuid().optional(),
        timestamp: z.string().datetime().optional(),
      }),
    )
    .min(1)
    .max(100),
})

routes.post('/events/batch', zValidator('json', batchSchema), async (c) => {
  const userId = await getOptionalUserIdFromAuthHeader(c.req.header('Authorization'))
  const bucketId = userId ?? c.req.header('x-forwarded-for') ?? 'anon'
  if (!(await rateLimitOk(bucketId, 'events-batch', 20, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many batched event requests')
  }

  const body = c.req.valid('json')
  if (body.events.length > 100) {
    return err(c, 422, 'EVENT_BATCH_LIMIT', 'events must contain at most 100 entries')
  }

  let accepted = 0
  let rejected = 0
  const toInsert: Array<{
    userId: string | null
    projectId: string | null
    eventType: string
    properties: Record<string, unknown>
    sessionId: string | null
    createdAt: Date
  }> = []

  for (const event of body.events) {
    try {
      const sanitized = sanitizeProperties(event.properties)
      toInsert.push({
        userId,
        projectId: event.projectId ?? null,
        eventType: event.eventType,
        properties: sanitized,
        sessionId: event.sessionId ?? null,
        createdAt: event.timestamp ? new Date(event.timestamp) : new Date(),
      })
      accepted += 1
    } catch {
      rejected += 1
    }
  }

  if (toInsert.length > 0) {
    await insertEventsBatch(toInsert as never).catch((error) => {
      logger.error('Batch event insert failed', { error })
      rejected += toInsert.length
      accepted = 0
    })
  }

  return ok(c, { accepted, rejected })
})

export default routes
