import { eq, sql } from 'drizzle-orm'

import { ragNamespaces } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { RagNamespace } from '../schema.js'

export function pineconeNamespaceForUser(userId: string): string {
  return `user_${userId.replace(/-/g, '')}`
}

export async function findOrCreateNamespace(userId: string): Promise<RagNamespace> {
  const db = getDb()
  const ns = pineconeNamespaceForUser(userId)
  await db
    .insert(ragNamespaces)
    .values({
      userId,
      pineconeNamespace: ns,
    })
    .onConflictDoNothing({ target: ragNamespaces.userId })

  const [row] = await db.select().from(ragNamespaces).where(eq(ragNamespaces.userId, userId)).limit(1)
  if (!row) throw new Error('findOrCreateNamespace: row missing after upsert')
  return row
}

export async function updateNamespaceStats(
  userId: string,
  delta: { docCountDelta: number; chunkCountDelta: number },
): Promise<void> {
  const db = getDb()
  await db
    .update(ragNamespaces)
    .set({
      docCount: sql`doc_count + ${delta.docCountDelta}`,
      totalChunks: sql`total_chunks + ${delta.chunkCountDelta}`,
      lastIndexedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ragNamespaces.userId, userId))
}

export async function getNamespaceStats(userId: string): Promise<RagNamespace | undefined> {
  const db = getDb()
  const [row] = await db.select().from(ragNamespaces).where(eq(ragNamespaces.userId, userId)).limit(1)
  return row
}

export async function deleteNamespace(userId: string): Promise<void> {
  const db = getDb()
  await db.delete(ragNamespaces).where(eq(ragNamespaces.userId, userId))
}
