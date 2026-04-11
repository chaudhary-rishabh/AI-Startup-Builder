import { z } from 'zod'

import * as integrationsQueries from '../../db/queries/integrations.queries.js'
import * as profilesQueries from '../../db/queries/profiles.queries.js'
import { logger } from '../../lib/logger.js'

const payloadSchema = z.object({
  userId: z.string().uuid(),
})

export async function handleUserDeleted(payload: unknown): Promise<void> {
  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) {
    logger.warn('user.deleted: invalid payload', { issues: parsed.error.flatten() })
    return
  }

  const { userId } = parsed.data

  try {
    await integrationsQueries.deleteAllIntegrationsForUser(userId)
    await profilesQueries.deleteProfile(userId)
    logger.info(
      JSON.stringify({
        event: 'user.deleted handled',
        userId,
      }),
    )
  } catch (e) {
    logger.error('user.deleted: cleanup failed', {
      userId,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
