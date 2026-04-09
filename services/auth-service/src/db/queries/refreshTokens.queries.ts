import { and, eq, gt, isNotNull, isNull, lt, sql } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import {
  refreshTokens,
  type NewRefreshToken,
  type RefreshToken,
} from '../schema.js'

export async function findRefreshToken(tokenHash: string): Promise<RefreshToken | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, sql`NOW()`),
      ),
    )
    .limit(1)
  return rows[0]
}

export async function findActiveTokensByUserId(userId: string): Promise<RefreshToken[]> {
  const db = getDb()
  return db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, sql`NOW()`),
      ),
    )
}

export async function createRefreshToken(data: NewRefreshToken): Promise<RefreshToken> {
  const db = getDb()
  const rows = await db.insert(refreshTokens).values(data).returning()
  const row = rows[0]
  if (!row) throw new Error('createRefreshToken: no row returned')
  return row
}

export async function revokeRefreshToken(tokenHash: string, replacedById?: string): Promise<void> {
  const db = getDb()
  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date(),
      replacedByTokenId: replacedById ?? null,
      updatedAt: new Date(),
    })
    .where(eq(refreshTokens.tokenHash, tokenHash))
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  const db = getDb()
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
}

export async function deleteExpiredTokens(): Promise<number> {
  const db = getDb()
  const rows = await db
    .delete(refreshTokens)
    .where(
      and(lt(refreshTokens.expiresAt, sql`NOW()`), isNotNull(refreshTokens.revokedAt)),
    )
    .returning({ id: refreshTokens.id })
  return rows.length
}
