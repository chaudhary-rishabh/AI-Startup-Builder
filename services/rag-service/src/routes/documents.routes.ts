import { createHash, randomUUID } from 'node:crypto'

import { Hono } from 'hono'
import { z } from 'zod'

import { enqueueIngestJob } from '../queues/embed.queue.js'
import {
  countDocumentsByUser,
  createRagDocument,
  deleteDocument,
  findDocumentByHash,
  findDocumentById,
  findDocumentFullText,
  findDocumentsByUser,
} from '../db/queries/ragDocuments.queries.js'
import {
  findOrCreateNamespace,
  pineconeNamespaceForUser,
  updateNamespaceStats,
} from '../db/queries/ragNamespaces.queries.js'
import { env } from '../config/env.js'
import { accepted, err, ok } from '../lib/response.js'
import { deleteFromS3 } from '../lib/s3.js'
import { uploadToS3 } from '../lib/s3.js'
import { getRedis } from '../lib/redis.js'
import { logger } from '../lib/logger.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { pineconeService } from '../services/pinecone.service.js'
import { ingestUrl } from '../services/urlIngestion.service.js'

const SUPPORTED_MIMES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export function estimateProcessingTime(bytes: number): number {
  return Math.max(5000, Math.ceil(bytes / 10_000) * 1000)
}

export function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '')
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 200) || 'upload.bin'
}

function getDocLimitForPlan(plan: string): number {
  const p = plan.toLowerCase()
  if (p === 'enterprise') return env.MAX_DOCS_ENTERPRISE_PLAN
  if (p === 'pro') return env.MAX_DOCS_PRO_PLAN
  return env.MAX_DOCS_FREE_PLAN
}

function fileTypeFromMime(mime: string, filename: string): 'pdf' | 'docx' | 'txt' | 'md' {
  if (mime.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) return 'pdf'
  if (mime.includes('wordprocessingml') || filename.toLowerCase().endsWith('.docx')) return 'docx'
  if (mime.includes('markdown') || filename.toLowerCase().endsWith('.md')) return 'md'
  return 'txt'
}

async function rateLimitOk(
  userId: string,
  bucket: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  const redis = getRedis()
  const k = `rag:rl:${bucket}:${userId}`
  const n = await redis.incr(k)
  if (n === 1) await redis.expire(k, windowSec)
  return n <= max
}

const documents = new Hono()

documents.use('*', requireAuth)

const ingestUrlBodySchema = z.object({
  url: z.string().url().max(2000),
  maxDepth: z.number().int().min(1).max(3).default(1),
  customInstructions: z.string().max(500).optional(),
})

documents.post('/rag/ingest-url', async (c) => {
  const userId = c.get('userId')
  const plan = c.get('userPlan')
  if (!(await rateLimitOk(userId, 'ingest-url', 3, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many URL ingest requests. Try again later.')
  }

  const json = (await c.req.json().catch(() => null)) as unknown
  const parsed = ingestUrlBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(c, 422, 'VALIDATION_ERROR', 'Invalid request body')
  }

  const body = parsed.data
  const indexedCount = await countDocumentsByUser(userId, 'indexed')
  const limit = getDocLimitForPlan(plan)
  if (indexedCount >= limit) {
    return err(c, 422, 'RAG_DOCUMENT_LIMIT_EXCEEDED', 'Document limit reached for your plan')
  }

  const result = await ingestUrl({
    url: body.url,
    maxDepth: body.maxDepth,
    userId,
    ...(body.customInstructions !== undefined ? { customInstructions: body.customInstructions } : {}),
  })

  const estimatedMs = 8000 + (body.maxDepth > 1 ? 20_000 : 0)
  if (result.status === 'indexed') {
    return ok(c, {
      docId: result.docId,
      url: result.url,
      status: 'indexed',
      estimatedMs: 0,
      message: 'URL content already indexed for this user.',
    })
  }

  return accepted(c, {
    docId: result.docId,
    url: result.url,
    status: 'crawling',
    estimatedMs,
    message: 'URL ingestion started. Check document status via GET /rag/documents.',
  })
})

documents.post('/rag/documents', async (c) => {
  const userId = c.get('userId')
  const plan = c.get('userPlan')
  if (!(await rateLimitOk(userId, 'upload', 5, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many uploads. Try again later.')
  }

  const body = await c.req.parseBody({ all: true })
  const file = body.file
  const customRaw = body['customInstructions']
  const customInstructions =
    typeof customRaw === 'string' ? customRaw.slice(0, 500) : undefined

  if (!(file instanceof File)) {
    return err(c, 400, 'VALIDATION_ERROR', 'Missing file field')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > env.MAX_FILE_SIZE_BYTES) {
    return err(c, 413, 'DOCUMENT_TOO_LARGE', 'File exceeds maximum allowed size')
  }

  const mimeType = file.type || 'application/octet-stream'
  if (!SUPPORTED_MIMES.has(mimeType)) {
    return err(c, 415, 'UNSUPPORTED_FILE_TYPE', `Unsupported content type: ${mimeType}`)
  }

  const indexedCount = await countDocumentsByUser(userId, 'indexed')
  const limit = getDocLimitForPlan(plan)
  if (indexedCount >= limit) {
    return err(c, 422, 'RAG_DOCUMENT_LIMIT_EXCEEDED', 'Document limit reached for your plan')
  }

  const hash = createHash('sha256').update(buffer).digest('hex')
  const existing = await findDocumentByHash(userId, hash)
  if (
    existing &&
    (existing.status === 'indexed' || existing.status === 'processing' || existing.status === 'pending')
  ) {
    if (existing.status === 'indexed') {
      return ok(c, {
        docId: existing.id,
        filename: existing.filename ?? existing.name,
        status: existing.status,
        message: 'Document already indexed',
        duplicate: true,
      })
    }
    return accepted(c, {
      docId: existing.id,
      filename: existing.filename ?? existing.name,
      status: existing.status,
      message: 'Document already being processed',
    })
  }

  const docId = randomUUID()
  const rawName = file.name || 'document'
  const filename = sanitizeFilename(rawName)
  const fileType = fileTypeFromMime(mimeType, filename)
  const s3Key = `rag/${userId}/${docId}/${filename}`

  await uploadToS3(s3Key, buffer, mimeType)

  const pineconeNamespace = pineconeNamespaceForUser(userId)
  const doc = await createRagDocument({
    id: docId,
    userId,
    name: filename,
    filename,
    fileType,
    fileSizeBytes: buffer.length,
    sourceType: 'upload',
    s3Key,
    contentHash: hash,
    status: 'pending',
    pineconeNamespace,
    customInstructions: customInstructions ?? null,
  })

  await findOrCreateNamespace(userId)

  await enqueueIngestJob({
    docId: doc.id,
    userId,
    s3Key,
    filename: doc.filename ?? doc.name,
    fileType: doc.fileType,
    contentHash: hash,
    plan,
  })

  return accepted(c, {
    docId: doc.id,
    filename: doc.filename ?? doc.name,
    status: 'processing',
    estimatedMs: estimateProcessingTime(buffer.length),
    message: 'Document uploaded. Indexing in progress.',
  })
})

documents.get('/rag/documents', async (c) => {
  const userId = c.get('userId')
  if (!(await rateLimitOk(userId, 'list', 60, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }
  const page = Number(c.req.query('page') ?? '1') || 1
  const limit = Math.min(100, Number(c.req.query('limit') ?? '20') || 20)
  const status = c.req.query('status')
  const listOpts: { page: number; limit: number; status?: string } = { page, limit }
  if (status !== undefined && status !== '') listOpts.status = status
  const result = await findDocumentsByUser(userId, listOpts)
  return ok(c, {
    documents: result.data,
    total: result.total,
    page,
    limit,
  })
})

documents.get('/rag/documents/:docId', async (c) => {
  const userId = c.get('userId')
  const docId = c.req.param('docId')
  if (!(await rateLimitOk(userId, 'getdoc', 60, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }

  const redis = getRedis()
  const cacheKey = `rag:docmeta:${userId}:${docId}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    try {
      return ok(c, JSON.parse(cached) as Record<string, unknown>)
    } catch {
      /* fall through */
    }
  }

  const doc = await findDocumentById(docId, userId)
  if (!doc) {
    return err(c, 404, 'DOCUMENT_NOT_FOUND', 'Document not found')
  }
  await redis.setex(cacheKey, Math.min(30, env.VECTOR_CACHE_TTL_SECONDS), JSON.stringify(doc))
  return ok(c, doc)
})

documents.get('/rag/documents/:docId/text', async (c) => {
  const userId = c.get('userId')
  const docId = c.req.param('docId')
  if (!(await rateLimitOk(userId, 'gettext', 60, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }

  const doc = await findDocumentById(docId, userId)
  if (!doc) {
    return err(c, 404, 'DOCUMENT_NOT_FOUND', 'Document not found')
  }
  if (doc.status !== 'indexed') {
    return err(c, 422, 'DOCUMENT_NOT_INDEXED', 'Document is still being processed.')
  }

  const result = await findDocumentFullText(docId, userId)
  if (!result) {
    return err(c, 404, 'EXTRACTED_TEXT_NOT_FOUND', 'Extracted text not available')
  }

  const wordCount = result.fullText.split(/\s+/).filter(Boolean).length
  return ok(c, {
    docId,
    filename: result.filename,
    fullText: result.fullText,
    wordCount,
  })
})

documents.delete('/rag/documents/:docId', async (c) => {
  const userId = c.get('userId')
  const docId = c.req.param('docId')
  if (!(await rateLimitOk(userId, 'delete', 10, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }

  const doc = await findDocumentById(docId, userId)
  if (!doc) {
    return err(c, 404, 'DOCUMENT_NOT_FOUND', 'Document not found')
  }

  let pineconeWarning: string | undefined
  try {
    await pineconeService.deleteVectorsByDocId(doc.pineconeNamespace, docId)
  } catch (e) {
    pineconeWarning = 'Pinecone deletion failed — vectors may persist'
    logger.error('Pinecone delete failed', { e, docId })
  }

  if (doc.s3Key) {
    void deleteFromS3(`${doc.s3Key}.extracted.txt`).catch((err) =>
      logger.error('S3 delete extracted failed', { err }),
    )
    void deleteFromS3(doc.s3Key).catch((err) => logger.error('S3 delete raw failed', { err }))
  }

  await deleteDocument(docId, userId)
  await updateNamespaceStats(userId, {
    docCountDelta: -1,
    chunkCountDelta: -(doc.chunkCount ?? 0),
  })

  const redis = getRedis()
  await redis.del(`rag:docmeta:${userId}:${docId}`)

  return ok(c, { deleted: true, warning: pineconeWarning })
})

export default documents
