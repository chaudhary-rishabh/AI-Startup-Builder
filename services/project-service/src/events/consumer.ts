import { z } from 'zod'

import { savePhaseOutput } from '../db/queries/phaseOutputs.queries.js'
import { updateLastActive } from '../db/queries/projects.queries.js'
import { getRedis } from '../services/redis.service.js'
import { handleUserDeleted } from './handlers/userDeleted.handler.js'

const STREAM = 'platform:events'
const GROUP = 'project-service-consumers'
const CONSUMER = 'project-consumer-1'

let consumerShouldRun = false

function isBusyGroupError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes('BUSYGROUP')
}

export async function ensureProjectServiceConsumerGroup(): Promise<void> {
  const redis = getRedis()
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM')
  } catch (e) {
    if (!isBusyGroupError(e)) throw e
  }
}

const agentRunCompletedSchema = z.object({
  projectId: z.string().uuid(),
  agentType: z.string(),
  outputData: z.record(z.unknown()),
  phase: z.number().int().min(1).max(6),
})

export async function handleAgentRunCompleted(payload: unknown): Promise<void> {
  const parsed = agentRunCompletedSchema.safeParse(payload)
  if (!parsed.success) {
    console.warn('[project-service] agent.run_completed: invalid payload', parsed.error.flatten())
    return
  }
  const { projectId, phase, outputData } = parsed.data
  await savePhaseOutput(projectId, phase, outputData, false)
  await updateLastActive(projectId)
  console.info(
    JSON.stringify({
      event: 'agent.run_completed processed',
      projectId,
      phase,
    }),
  )
}

export async function routeEvent(type: string, payload: unknown): Promise<void> {
  switch (type) {
    case 'agent.run_completed':
      await handleAgentRunCompleted(payload)
      return
    case 'user.deleted':
      await handleUserDeleted(payload)
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
  await ensureProjectServiceConsumerGroup()

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
      console.error(
        '[project-service] Event consumer error',
        e instanceof Error ? e.message : String(e),
      )
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}
