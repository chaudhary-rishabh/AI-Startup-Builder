import { eq } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import {
  mfaCredentials,
  type MfaCredential,
  type NewMfaCredential,
} from '../schema.js'

export async function findMfaByUserId(userId: string): Promise<MfaCredential | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, userId))
    .limit(1)
  return rows[0]
}

export async function createMfaCredential(data: NewMfaCredential): Promise<MfaCredential> {
  const db = getDb()
  const rows = await db.insert(mfaCredentials).values(data).returning()
  const row = rows[0]
  if (!row) throw new Error('createMfaCredential: no row returned')
  return row
}

export async function updateMfaCredential(
  userId: string,
  data: Partial<NewMfaCredential>,
): Promise<MfaCredential | undefined> {
  const db = getDb()
  const patch = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  ) as Partial<NewMfaCredential>
  if (Object.keys(patch).length === 0) {
    return findMfaByUserId(userId)
  }
  const rows = await db
    .update(mfaCredentials)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(mfaCredentials.userId, userId))
    .returning()
  return rows[0]
}

export async function enableMfa(userId: string): Promise<void> {
  const db = getDb()
  await db
    .update(mfaCredentials)
    .set({
      isEnabled: true,
      enabledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(mfaCredentials.userId, userId))
}

export async function disableMfa(userId: string): Promise<void> {
  const db = getDb()
  await db
    .update(mfaCredentials)
    .set({
      isEnabled: false,
      enabledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(mfaCredentials.userId, userId))
}

export async function deleteMfaCredential(userId: string): Promise<void> {
  const db = getDb()
  await db.delete(mfaCredentials).where(eq(mfaCredentials.userId, userId))
}

export async function updateLastUsed(userId: string): Promise<void> {
  const db = getDb()
  await db
    .update(mfaCredentials)
    .set({
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(mfaCredentials.userId, userId))
}
