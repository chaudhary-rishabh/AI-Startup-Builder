import { and, eq } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import {
  userIntegrations,
  type NewUserIntegration,
  type UserIntegration,
} from '../schema.js'

export async function findIntegrationsByUserId(userId: string): Promise<UserIntegration[]> {
  const db = getDb()
  return db.select().from(userIntegrations).where(eq(userIntegrations.userId, userId))
}

export async function findIntegration(
  userId: string,
  service: string,
): Promise<UserIntegration | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.service, service as UserIntegration['service']),
      ),
    )
    .limit(1)
  return rows[0]
}

export async function upsertIntegration(data: NewUserIntegration): Promise<UserIntegration> {
  const db = getDb()
  const rows = await db
    .insert(userIntegrations)
    .values(data)
    .onConflictDoUpdate({
      target: [userIntegrations.userId, userIntegrations.service],
      set: {
        accessTokenEnc: data.accessTokenEnc,
        refreshTokenEnc: data.refreshTokenEnc ?? null,
        scopes: data.scopes,
        metadata: data.metadata,
        expiresAt: data.expiresAt ?? null,
        updatedAt: new Date(),
      },
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error('upsertIntegration: no row returned')
  return row
}

export async function deleteIntegration(userId: string, service: string): Promise<void> {
  const db = getDb()
  await db
    .delete(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.service, service as UserIntegration['service']),
      ),
    )
}

export async function deleteAllIntegrationsForUser(userId: string): Promise<void> {
  const db = getDb()
  await db.delete(userIntegrations).where(eq(userIntegrations.userId, userId))
}
