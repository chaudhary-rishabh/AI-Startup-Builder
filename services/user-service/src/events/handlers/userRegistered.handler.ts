import { z } from 'zod'

import * as onboardingQueries from '../../db/queries/onboarding.queries.js'
import * as profilesQueries from '../../db/queries/profiles.queries.js'
import { logger } from '../../lib/logger.js'

const payloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  name: z.string(),
  plan: z.string(),
})

export async function handleUserRegistered(payload: unknown): Promise<void> {
  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) {
    logger.warn('user.registered: invalid payload', { issues: parsed.error.flatten() })
    return
  }

  const { userId } = parsed.data

  try {
    const existing = await profilesQueries.findProfileById(userId)
    if (existing) {
      logger.info('user.registered: profile already exists, skipping', { userId })
      return
    }

    await profilesQueries.createProfile({
      id: userId,
      timezone: 'UTC',
      notificationPrefs: {
        emailOnPhaseComplete: true,
        emailOnBilling: true,
        inAppAll: true,
      },
      themePrefs: {
        preferredMode: 'design',
        sidebarCollapsed: false,
      },
    })

    await onboardingQueries.createOnboardingState(userId)

    logger.info(
      JSON.stringify({
        event: 'user.registered',
        userId,
        profileCreated: true,
      }),
    )
  } catch (e) {
    logger.error('user.registered: handler failed', {
      userId,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
