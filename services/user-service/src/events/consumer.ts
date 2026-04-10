import { z } from 'zod'

import { logger } from '../lib/logger.js'
import { getRedis } from '../services/redis.service.js'
import { handleUserRegistered } from './handlers/userRegistered.handler.js'

const STREAM = 'platform:events'
const GROUP = 'user-service-consumers'
const CONSUMER = 'user-consumer-1'

let consumerShouldRun = false

function isBusyGroupError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes('BUSYGROUP')
}

export async function ensureUserServiceConsumerGroup(): Promise<void> {
  const redis = getRedis()
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM')
  } catch (e) {
    if (!isBusyGroupError(e)) throw e
  }
}

const subscriptionUpgradedSchema = z.object({
  userId: z.string().uuid(),
  newPlan: z.string(),
})

async function handleSubscriptionUpgraded(payload: unknown): Promise<void> {
  const parsed = subscriptionUpgradedSchema.safeParse(payload)
  if (!parsed.success) {
    logger.warn('subscription.upgraded: invalid payload', { issues: parsed.error.flatten() })
    return
  }
  logger.info('subscription.upgraded observed (plan owned by auth-service)', {
    userId: parsed.data.userId,
    newPlan: parsed.data.newPlan,
  })
}

export async function routeEvent(type: string, payload: unknown): Promise<void> {
  switch (type) {
    case 'user.registered':
      await handleUserRegistered(payload)
      return
    case 'subscription.upgraded':
      await handleSubscriptionUpgraded(payload)
      return
    default:
      return
  }
}

function parsePayload(raw: string | undefined): unknown {
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

export function stopConsumer(): void {
  consumerShouldRun = false
}

export async function startEventConsumer(): Promise<void> {
  consumerShouldRun = true
  const redis = getRedis()
  await ensureUserServiceConsumerGroup()

  while (consumerShouldRun) {
    try {
      const messages = await redis.xreadgroup(
        'GROUP',
        GROUP,
        CONSUMER,
        'COUNT',
        '10',
        'BLOCK',
        '5000',
        'STREAMS',
        STREAM,
        '>',
      )

      if (!consumerShouldRun) break

      if (!messages || !Array.isArray(messages)) continue

      for (const [, entries] of messages as [string, [string, string[]][]][]) {
        if (!entries || !Array.isArray(entries)) continue
        for (const entry of entries) {
          const id = entry[0]
          const fields = entry[1] as string[]
          const map: Record<string, string> = {}
          for (let i = 0; i < fields.length; i += 2) {
            const k = fields[i]
            const v = fields[i + 1]
            if (k !== undefined && v !== undefined) map[k] = v
          }
          const evtType = map['type']
          if (evtType) {
            const pl = parsePayload(map['payload'])
            await routeEvent(evtType, pl)
          }
          await redis.xack(STREAM, GROUP, id)
        }
      }
    } catch (e) {
      logger.error('Event consumer error', { error: e instanceof Error ? e.message : String(e) })
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}
