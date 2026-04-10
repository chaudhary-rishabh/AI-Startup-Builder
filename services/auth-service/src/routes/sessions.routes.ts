import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import * as refreshQueries from '../db/queries/refreshTokens.queries.js'
import { refreshTokens } from '../db/schema.js'
import { getDb } from '../lib/db.js'
import { err, ok } from '../lib/response.js'
import { hashToken } from '../services/password.service.js'
import { requireAuth } from './mfa.routes.js'

const RevokeOthersBodySchema = z.object({
  keepCurrentToken: z.string().optional(),
})

const sessions = new Hono()

sessions.get('/sessions', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string
  const rows = await refreshQueries.findActiveTokensByUserId(userId)
  const sessionsOut = rows.map((r) => ({
    id: r.id,
    deviceInfo: r.deviceInfo ?? null,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    lastUsed: null as null,
  }))
  return ok(c, { sessions: sessionsOut })
})

sessions.delete('/sessions/:tokenId', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string
  const tokenId = c.req.param('tokenId')
  const db = getDb()
  const rows = await db.select().from(refreshTokens).where(eq(refreshTokens.id, tokenId)).limit(1)
  const row = rows[0]
  if (!row) {
    return err(c, 404, 'NOT_FOUND', 'Session not found')
  }
  if (row.userId !== userId) {
    return err(c, 403, 'FORBIDDEN', 'You cannot revoke this session')
  }
  await refreshQueries.revokeRefreshToken(row.tokenHash)
  return ok(c, { message: 'Session revoked' })
})

sessions.delete(
  '/sessions',
  requireAuth,
  zValidator('json', RevokeOthersBodySchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.get('userId' as never) as string
    const { keepCurrentToken } = c.req.valid('json')
    const keepHash = keepCurrentToken ? hashToken(keepCurrentToken) : undefined

    const active = await refreshQueries.findActiveTokensByUserId(userId)
    let count = 0
    for (const t of active) {
      if (keepHash && t.tokenHash === keepHash) continue
      await refreshQueries.revokeRefreshToken(t.tokenHash)
      count += 1
    }
    return ok(c, { message: 'All other sessions revoked', count })
  },
)

export default sessions
