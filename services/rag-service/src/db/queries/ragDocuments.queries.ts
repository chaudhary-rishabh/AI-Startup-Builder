import { paginate } from '@repo/db'
import { and, count, desc, eq, sql } from 'drizzle-orm'

import { ragDocuments } from '../schema.js'
import { downloadFromS3 } from '../../lib/s3.js'
import { getDb } from '../../lib/db.js'

import type { NewRagDocument, RagDocument } from '../schema.js'

export async function createRagDocument(data: NewRagDocument): Promise<RagDocument> {
  const db = getDb()
  const [row] = await db.insert(ragDocuments).values(data).returning()
  if (!row) throw new Error('createRagDocument: insert returned no row')
  return row
}

export async function findDocumentById(id: string, userId: string): Promise<RagDocument | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(ragDocuments)
    .where(and(eq(ragDocuments.id, id), eq(ragDocuments.userId, userId)))
    .limit(1)
  return row
}

export async function findDocumentsByUser(
  userId: string,
  opts: { page?: number; limit?: number; status?: string },
): Promise<{ data: RagDocument[]; total: number }> {
  const db = getDb()
  const baseWhere = and(
    eq(ragDocuments.userId, userId),
    opts.status !== undefined
      ? eq(ragDocuments.status, opts.status as RagDocument['status'])
      : undefined,
  )

  const result = await paginate({
    page: opts.page ?? 1,
    limit: opts.limit ?? 20,
    dataFn: (limit, offset) =>
      db
        .select()
        .from(ragDocuments)
        .where(baseWhere)
        .orderBy(desc(ragDocuments.createdAt))
        .limit(limit)
        .offset(offset),
    countFn: async () => {
      const [r] = await db.select({ c: count() }).from(ragDocuments).where(baseWhere)
      return Number(r?.c ?? 0)
    },
  })
  return { data: result.data as RagDocument[], total: result.meta.total }
}

export async function findDocumentByHash(
  userId: string,
  contentHash: string,
): Promise<RagDocument | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(ragDocuments)
    .where(and(eq(ragDocuments.userId, userId), eq(ragDocuments.contentHash, contentHash)))
    .limit(1)
  return row
}

export async function updateDocumentStatus(
  id: string,
  data: {
    status: string
    chunkCount?: number
    indexedAt?: Date
    errorMessage?: string
  },
): Promise<RagDocument | undefined> {
  const db = getDb()
  const [row] = await db
    .update(ragDocuments)
    .set({
      status: data.status as RagDocument['status'],
      ...(data.chunkCount !== undefined ? { chunkCount: data.chunkCount } : {}),
      ...(data.indexedAt !== undefined ? { indexedAt: data.indexedAt } : {}),
      ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
    })
    .where(eq(ragDocuments.id, id))
    .returning()
  return row
}

export async function deleteDocument(id: string, userId: string): Promise<boolean> {
  const db = getDb()
  const res = await db
    .delete(ragDocuments)
    .where(and(eq(ragDocuments.id, id), eq(ragDocuments.userId, userId)))
    .returning({ id: ragDocuments.id })
  return res.length > 0
}

export async function countDocumentsByUser(userId: string, status?: string): Promise<number> {
  const db = getDb()
  const whereClause = and(
    eq(ragDocuments.userId, userId),
    status !== undefined ? eq(ragDocuments.status, status as RagDocument['status']) : undefined,
  )
  const [r] = await db.select({ c: count() }).from(ragDocuments).where(whereClause)
  return Number(r?.c ?? 0)
}

export async function findAllIndexedDocumentsForUser(userId: string): Promise<RagDocument[]> {
  const db = getDb()
  return db
    .select()
    .from(ragDocuments)
    .where(and(eq(ragDocuments.userId, userId), eq(ragDocuments.status, 'indexed')))
    .orderBy(desc(ragDocuments.createdAt))
}

export async function findDocumentFullText(
  id: string,
  userId: string,
): Promise<{ filename: string; fullText: string } | undefined> {
  const doc = await findDocumentById(id, userId)
  if (!doc?.s3Key) return undefined
  const key = `${doc.s3Key}.extracted.txt`
  try {
    const buf = await downloadFromS3(key)
    const fullText = buf.toString('utf-8')
    return { filename: doc.filename ?? doc.name, fullText }
  } catch {
    return undefined
  }
}

export async function listDocumentsByUserForDeletion(userId: string): Promise<RagDocument[]> {
  const db = getDb()
  return db.select().from(ragDocuments).where(eq(ragDocuments.userId, userId))
}

/** Bulk delete for user.deleted event — internal use */
export async function deleteAllDocumentsForUser(userId: string): Promise<void> {
  const db = getDb()
  await db.delete(ragDocuments).where(eq(ragDocuments.userId, userId))
}
