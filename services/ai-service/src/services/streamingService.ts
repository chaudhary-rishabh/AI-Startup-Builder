import { Redis } from 'ioredis'

import { env } from '../config/env.js'
import { getRedis } from '../lib/redis.js'

export function getStreamChannel(runId: string): string {
  return `ai:stream:${runId}`
}

export async function publishStreamChunk(runId: string, chunk: string): Promise<void> {
  const payload = JSON.stringify({
    type: 'token',
    data: chunk,
    runId,
    ts: Date.now(),
  })
  await getRedis().publish(getStreamChannel(runId), payload)
}

export async function publishStreamEvent(
  runId: string,
  eventType:
    | 'start'
    | 'complete'
    | 'error'
    | 'file_start'
    | 'file_complete'
    | 'batch_start'
    | 'batch_complete'
    | 'cross_check'
    | 'doc_mode',
  payload?: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({ type: eventType, runId, ts: Date.now(), ...payload })
  await getRedis().publish(getStreamChannel(runId), body)
}

export async function subscribeToStream(
  runId: string,
  onMessage: (raw: string) => void,
  onEnd: () => void,
): Promise<{ unsubscribe: () => Promise<void> }> {
  const subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const channel = getStreamChannel(runId)
  let ended = false

  const heartbeat = setInterval(() => {
    if (!ended) onMessage(': heartbeat\n\n')
  }, 15_000)

  const onMsg = (ch: string, message: string) => {
    if (ch !== channel) return
    onMessage(message)
    try {
      const parsed = JSON.parse(message) as { type?: string }
      if (parsed.type === 'complete' || parsed.type === 'error') {
        ended = true
        clearInterval(heartbeat)
        subscriber.off('message', onMsg)
        void subscriber
          .unsubscribe(channel)
          .then(() => subscriber.quit())
          .catch(() => undefined)
          .finally(onEnd)
      }
    } catch {
      /* ignore */
    }
  }

  subscriber.on('message', onMsg)
  await subscriber.subscribe(channel).catch((e) => {
    console.error('[ai-service] subscribe failed', e)
  })

  return {
    unsubscribe: async () => {
      ended = true
      clearInterval(heartbeat)
      subscriber.off('message', onMsg)
      await subscriber.unsubscribe(channel).catch(() => undefined)
      await subscriber.quit().catch(() => undefined)
    },
  }
}
