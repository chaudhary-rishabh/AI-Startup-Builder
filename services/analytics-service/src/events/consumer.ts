import { insertEvent } from '../db/queries/platformEvents.queries.js'
import { logger } from '../lib/logger.js'
import { getRedis } from '../lib/redis.js'

const STREAM = 'platform:events'
const GROUP = 'analytics-service-consumers'
const CONSUMER = 'analytics-consumer-1'

let shouldRun = false

function isBusyGroupError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('BUSYGROUP')
}

function parsePayload(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return undefined
  }
}

const planRank: Record<string, number> = { free: 0, pro: 1, team: 2, enterprise: 3 }

function canonicalizeEvent(
  type: string,
  payload: Record<string, unknown>,
): { eventType: string; properties: Record<string, unknown> } {
  if (type === 'user.registered') return { eventType: 'user.signed_up', properties: payload }
  if (type === 'agent.run.failed') return { eventType: 'agent.run.failed', properties: payload }
  if (type === 'project.phase.advanced') return { eventType: 'project.phase.advanced', properties: payload }
  if (type === 'invoice.paid') return { eventType: 'revenue.received', properties: payload }
  if (type === 'document.indexed') return { eventType: 'rag.document.indexed', properties: payload }
  if (type === 'subscription.upgraded') {
    const fromPlan = String(payload['oldPlan'] ?? payload['fromPlan'] ?? 'free')
    const toPlan = String(payload['newPlan'] ?? payload['toPlan'] ?? 'free')
    const fromRank = planRank[fromPlan] ?? 0
    const toRank = planRank[toPlan] ?? 0
    return {
      eventType: toRank >= fromRank ? 'plan.upgraded' : 'plan.downgraded',
      properties: { ...payload, fromPlan, toPlan },
    }
  }
  return { eventType: type, properties: payload }
}

export async function processIncomingEvent(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const canonical = canonicalizeEvent(type, payload)
  try {
    await insertEvent({
      userId: (payload['userId'] as string | undefined) ?? null,
      projectId: (payload['projectId'] as string | undefined) ?? null,
      eventType: canonical.eventType,
      properties: canonical.properties,
      sessionId: (payload['sessionId'] as string | undefined) ?? null,
      createdAt: new Date(),
    })
  } catch (error) {
    logger.error('Failed to record platform event', { error, eventType: type })
  }
}

export async function ensureAnalyticsConsumerGroup(): Promise<void> {
  const redis = getRedis()
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM')
  } catch (error) {
    if (!isBusyGroupError(error)) throw error
  }
}

export function stopAnalyticsConsumer(): void {
  shouldRun = false
}

export async function startAnalyticsEventConsumer(): Promise<void> {
  shouldRun = true
  const redis = getRedis()
  await ensureAnalyticsConsumerGroup()

  while (shouldRun) {
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
      if (!messages || !Array.isArray(messages)) continue
      for (const [, entries] of messages as [string, [string, string[]][]][]) {
        for (const entry of entries ?? []) {
          const id = entry[0]
          const fields = entry[1] as string[]
          const map: Record<string, string> = {}
          for (let i = 0; i < fields.length; i += 2) {
            const key = fields[i]
            const value = fields[i + 1]
            if (key !== undefined && value !== undefined) map[key] = value
          }
          const type = map['type']
          const payload = parsePayload(map['payload']) ?? {}
          if (type) await processIncomingEvent(type, payload)
          await redis.xack(STREAM, GROUP, id)
        }
      }
    } catch (error) {
      logger.error('analytics consumer error', { error })
      await new Promise((resolve) => setTimeout(resolve, 5_000))
    }
  }
}
