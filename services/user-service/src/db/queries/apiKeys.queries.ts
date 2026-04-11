import { and, count, desc, eq, gt, isNull, or, sql } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import { apiKeys, type ApiKey, type NewApiKey } from '../schema.js'

export async function findApiKeysByUserId(userId: string): Promise<ApiKey[]> {
  const db = getDb()
  return db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt))
}

export async function findApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, keyHash),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, sql`now()`)),
      ),
    )
    .limit(1)
  return rows[0]
}

export async function findApiKeyById(id: string, userId: string): Promise<ApiKey | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .limit(1)
  return rows[0]
}

export async function createApiKey(data: NewApiKey): Promise<ApiKey> {
  const db = getDb()
  const rows = await db.insert(apiKeys).values(data).returning()
  const row = rows[0]
  if (!row) throw new Error('createApiKey: insert returned no row')
  return row
}

export async function revokeApiKey(id: string, userId: string): Promise<boolean> {
  const db = getDb()
  const rows = await db
    .update(apiKeys)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id })
  return rows.length > 0
}

export async function updateLastUsed(keyHash: string): Promise<void> {
  const db = getDb()
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiKeys.keyHash, keyHash))
}

export async function countActiveKeysByUserId(userId: string): Promise<number> {
  const db = getDb()
  const rows = await db
    .select({ n: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
  return Number(rows[0]?.n ?? 0)
}
