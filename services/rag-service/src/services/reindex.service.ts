import {
  findAllDocumentsForUser,
  updateDocumentStatus,
} from '../db/queries/ragDocuments.queries.js'
import { getNamespaceStats, updateNamespaceStats } from '../db/queries/ragNamespaces.queries.js'
import { logger } from '../lib/logger.js'
import { enqueueIngestJob } from '../queues/embed.queue.js'
import { pineconeService } from './pinecone.service.js'

export async function forceReindex(userId: string): Promise<{ documentsQueued: number }> {
  const docs = await findAllDocumentsForUser(userId)
  if (docs.length === 0) return { documentsQueued: 0 }

  const namespace = `user_${userId.replace(/-/g, '')}`
  try {
    await pineconeService.deleteNamespace(namespace)
  } catch (error) {
    logger.error('Pinecone namespace delete failed during force reindex', { error, userId })
  }

  for (const doc of docs) {
    await updateDocumentStatus(doc.id, {
      status: 'pending',
      chunkCount: null,
      indexedAt: null,
      errorMessage: null,
    })
  }

  let queued = 0
  for (const doc of docs) {
    if (!doc.s3Key) continue
    await enqueueIngestJob({
      docId: doc.id,
      userId: doc.userId,
      s3Key: doc.s3Key,
      filename: doc.filename ?? doc.name,
      fileType: doc.fileType,
      contentHash: doc.contentHash,
    })
    queued++
  }

  const nsStats = await getNamespaceStats(userId)
  if (nsStats) {
    await updateNamespaceStats(userId, {
      docCountDelta: -nsStats.docCount,
      chunkCountDelta: -nsStats.totalChunks,
    })
  }

  logger.info('Force reindex initiated', { userId, documentsQueued: queued })
  return { documentsQueued: queued }
}
