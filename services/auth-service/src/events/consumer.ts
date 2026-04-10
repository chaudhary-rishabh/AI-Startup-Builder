import { getRedis } from '../services/redis.service.js'
import { handleSubscriptionUpgraded } from './handlers/subscriptionUpgraded.handler.js'

const STREAM = 'platform:events'
const GROUP = 'auth-service-consumers'
const CONSUMER = 'auth-consumer-1'

let consumerShouldRun = false

function isBusyGroupError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes('BUSYGROUP')
}

export async function ensureAuthServiceConsumerGroup(): Promise<void> {
  const redis = getRedis()
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM')
  } catch (e) {
    if (!isBusyGroupError(e)) throw e
  }
}

export async function routeEvent(type: string, payload: unknown): Promise<void> {
  switch (type) {
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
  await ensureAuthServiceConsumerGroup()

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

      if (!messages) continue

      for (const [, entries] of messages) {
        if (!entries) continue
        for (const entry of entries) {
          const id = entry[0]
          const fields = entry[1] as string[]
          const map: Record<string, string> = {}
          for (let i = 0; i < fields.length; i += 2) {
            const k = fields[i]
            const v = fields[i + 1]
            if (k !== undefined && v !== undefined) map[k] = v
          }
          const type = map['type']
          if (type) {
            const payload = parsePayload(map['payload'])
            await routeEvent(type, payload)
          }
          await redis.xack(STREAM, GROUP, id)
        }
      }
    } catch (e) {
      console.error('[auth-service] Event consumer error:', e)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}
