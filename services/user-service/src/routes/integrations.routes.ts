import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { UserIntegration } from '../db/schema.js'
import * as integrationsQueries from '../db/queries/integrations.queries.js'
import { publishUserProfileUpdated } from '../events/publisher.js'
import { created, err, ok } from '../lib/response.js'
import { sanitizeMetadata } from '../lib/sanitizeIntegrationMetadata.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { encrypt } from '../services/encryption.service.js'

const IntegrationServiceSchema = z.enum(['notion', 'github', 'figma', 'vercel', 'posthog', 'ga4'])

const ConnectIntegrationBodySchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
})

function toPublicIntegration(row: UserIntegration) {
  const expiresAt = row.expiresAt
  return {
    id: row.id,
    service: row.service,
    scopes: row.scopes as string[],
    metadata: row.metadata as Record<string, unknown>,
    expiresAt: expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    isExpired: expiresAt ? expiresAt < new Date() : false,
  }
}

function toPublicIntegrationNoExpiryFlag(row: UserIntegration) {
  const expiresAt = row.expiresAt
  return {
    id: row.id,
    service: row.service,
    scopes: row.scopes as string[],
    metadata: row.metadata as Record<string, unknown>,
    expiresAt: expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

const integrations = new Hono()

integrations.get('/me/integrations', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string
  const rows = await integrationsQueries.findIntegrationsByUserId(userId)
  return ok(c, { integrations: rows.map(toPublicIntegration) })
})

integrations.post(
  '/me/integrations/:service',
  requireAuth,
  zValidator('json', ConnectIntegrationBodySchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.get('userId' as never) as string
    const serviceRaw = c.req.param('service')
    const serviceParsed = IntegrationServiceSchema.safeParse(serviceRaw)
    if (!serviceParsed.success) {
      return err(c, 400, 'INVALID_SERVICE', 'Invalid integration service')
    }
    const service = serviceParsed.data
    const body = c.req.valid('json')

    const accessTokenEnc = encrypt(body.accessToken)
    const refreshTokenEnc =
      body.refreshToken !== undefined && body.refreshToken !== '' ? encrypt(body.refreshToken) : null

    const row = await integrationsQueries.upsertIntegration({
      userId,
      service,
      accessTokenEnc,
      refreshTokenEnc,
      scopes: body.scopes ?? [],
      metadata: sanitizeMetadata(body.metadata ?? {}),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })

    try {
      await publishUserProfileUpdated(userId, [`integration.${service}.connected`])
    } catch (e) {
      console.error('[user-service] Failed to publish profile update:', e)
    }

    return created(c, { integration: toPublicIntegrationNoExpiryFlag(row) })
  },
)

integrations.delete('/me/integrations/:service', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string
  const serviceParam = c.req.param('service')
  const parsed = IntegrationServiceSchema.safeParse(serviceParam)
  if (!parsed.success) {
    return err(c, 400, 'INVALID_SERVICE', 'Invalid integration service')
  }
  const service = parsed.data

  const existing = await integrationsQueries.findIntegration(userId, service)
  if (!existing) {
    return err(c, 404, 'INTEGRATION_NOT_FOUND', 'Integration not found')
  }

  await integrationsQueries.deleteIntegration(userId, service)

  try {
    await publishUserProfileUpdated(userId, [`integration.${service}.disconnected`])
  } catch (e) {
    console.error('[user-service] Failed to publish profile update:', e)
  }

  return ok(c, { message: `${service} integration disconnected` })
})

export default integrations
