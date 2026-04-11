import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import * as apiKeysQueries from '../db/queries/apiKeys.queries.js'
import type { ApiKey } from '../db/schema.js'
import { publishUserApiKeyCreated, publishUserApiKeyRevoked } from '../events/publisher.js'
import { created, err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  extractPrefix,
  generateApiKey,
  getPlanKeyLimit,
  hashApiKey,
} from '../services/apiKey.service.js'
import { getRedis } from '../services/redis.service.js'

const ApiKeyScopeSchema = z.enum(['read', 'write', 'ai', 'rag', 'admin'])

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(200),
  scopes: z.array(ApiKeyScopeSchema).min(1),
  expiresInDays: z.number().int().positive().max(3650).optional(),
})

const RATE_LIMIT_MAX = 5
const RATE_WINDOW_SEC = 60

async function enforceApiKeyCreateRateLimit(userId: string): Promise<boolean> {
  const redis = getRedis()
  const key = `ratelimit:api-key-create:${userId}`
  const n = await redis.incr(key)
  if (n === 1) {
    await redis.expire(key, RATE_WINDOW_SEC)
  }
  return n <= RATE_LIMIT_MAX
}

function toPublicApiKey(row: ApiKey) {
  return {
    id: row.id,
    prefix: row.prefix,
    name: row.name,
    scopes: row.scopes as string[],
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

const apiKeysRoutes = new Hono()

apiKeysRoutes.get('/me/api-keys', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string
  const rows = await apiKeysQueries.findApiKeysByUserId(userId)
  return ok(c, { keys: rows.map(toPublicApiKey) })
})

apiKeysRoutes.post(
  '/me/api-keys',
  requireAuth,
  zValidator('json', CreateApiKeySchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.get('userId' as never) as string
    const plan = c.get('userPlan' as never) as string
    const body = c.req.valid('json')

    const allowed = await enforceApiKeyCreateRateLimit(userId)
    if (!allowed) {
      return err(c, 429, 'RATE_LIMIT_EXCEEDED', 'Too many API key creation attempts. Try again later.')
    }

    const planLimit = getPlanKeyLimit(plan)
    const count = await apiKeysQueries.countActiveKeysByUserId(userId)
    if (planLimit !== -1 && count >= planLimit) {
      return err(
        c,
        422,
        'API_KEY_LIMIT_EXCEEDED',
        `Your plan allows maximum ${planLimit} API keys. Upgrade to create more.`,
      )
    }

    const rawKey = generateApiKey()
    const keyHash = hashApiKey(rawKey)
    const prefix = extractPrefix(rawKey)
    const expiresAt =
      body.expiresInDays !== undefined
        ? new Date(Date.now() + body.expiresInDays * 86_400_000)
        : null

    const newKey = await apiKeysQueries.createApiKey({
      userId,
      keyHash,
      prefix,
      name: body.name,
      scopes: body.scopes,
      expiresAt,
    })

    try {
      await publishUserApiKeyCreated(userId, newKey.id, body.scopes)
    } catch (e) {
      console.error('[user-service] Failed to publish user.api_key_created:', e)
    }

    return created(c, {
      ...toPublicApiKey(newKey),
      key: rawKey,
      warning: 'Store this key securely — it will not be shown again',
    })
  },
)

apiKeysRoutes.delete('/me/api-keys/:keyId', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string
  const keyId = c.req.param('keyId')
  const revoked = await apiKeysQueries.revokeApiKey(keyId, userId)
  if (!revoked) {
    return err(c, 404, 'API_KEY_NOT_FOUND', 'API key not found')
  }
  const revokedAt = new Date().toISOString()
  try {
    await publishUserApiKeyRevoked(userId, keyId, revokedAt)
  } catch (e) {
    console.error('[user-service] Failed to publish user.api_key_revoked:', e)
  }
  return ok(c, { message: 'API key revoked' })
})

export default apiKeysRoutes
