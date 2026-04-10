import { z } from 'zod'

import * as usersQueries from '../../db/queries/users.queries.js'

const subscriptionUpgradedPayloadSchema = z.object({
  userId: z.string().uuid(),
  newPlan: z.enum(['free', 'pro', 'enterprise']),
  tokenLimit: z.number(),
})

export async function handleSubscriptionUpgraded(payload: unknown): Promise<void> {
  const parsed = subscriptionUpgradedPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    console.warn('[auth-service] subscription.upgraded: invalid payload', parsed.error.flatten())
    return
  }

  const { userId, newPlan } = parsed.data

  try {
    await usersQueries.updateUser(userId, { planTier: newPlan })
    console.log(
      JSON.stringify({
        event: 'subscription.upgraded',
        userId,
        newPlan,
      }),
    )
  } catch (e) {
    console.error('[auth-service] subscription.upgraded: failed to update user', e)
  }
}
