import {
  deleteAllDocumentsForUser,
  listDocumentsByUserForDeletion,
} from '../db/queries/ragDocuments.queries.js'
import {
  deleteNamespace,
  findOrCreateNamespace,
  pineconeNamespaceForUser,
} from '../db/queries/ragNamespaces.queries.js'
import { getRedis } from '../lib/redis.js'
import { logger } from '../lib/logger.js'
import { pineconeService } from '../services/pinecone.service.js'

const STREAM = 'platform:events'
const GROUP = 'rag-service-consumers'
const CONSUMER = 'rag-consumer-1'

let consumerShouldRun = false

function isBusyGroupError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes('BUSYGROUP')
}

export async function ensureRagConsumerGroup(): Promise<void> {
  const redis = getRedis()
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM')
  } catch (e) {
    if (!isBusyGroupError(e)) throw e
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

export function stopRagConsumer(): void {
  consumerShouldRun = false
}

export async function startRagEventConsumer(): Promise<void> {
  consumerShouldRun = true
  const redis = getRedis()
  await ensureRagConsumerGroup()

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
          const pl = parsePayload(map['payload'])

          if (evtType === 'user.registered') {
            const rec = pl as { userId?: string }
            if (rec.userId) {
              await findOrCreateNamespace(rec.userId)
              logger.info('Initialized RAG namespace for new user', { userId: rec.userId })
            }
          } else if (evtType === 'user.deleted') {
            const rec = pl as { userId?: string }
            if (rec.userId) {
              const userId = rec.userId
              const namespace = pineconeNamespaceForUser(userId)
              await pineconeService.deleteNamespace(namespace).catch((err) => {
                logger.error('Namespace deletion failed', { err })
              })
              const docs = await listDocumentsByUserForDeletion(userId)
              for (const d of docs) {
                await pineconeService
                  .deleteVectorsByDocId(d.pineconeNamespace, d.id)
                  .catch((err) => logger.error('Chunk delete failed', { err, docId: d.id }))
              }
              await deleteAllDocumentsForUser(userId)
              await deleteNamespace(userId).catch((err) => {
                logger.error('Namespace DB cleanup failed', { err })
              })
            }
          }

          await redis.xack(STREAM, GROUP, id)
        }
      }
    } catch (e) {
      logger.error(
        '[rag-service] Event consumer error',
        e instanceof Error ? e.message : String(e),
      )
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}
