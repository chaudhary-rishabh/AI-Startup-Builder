import { and, eq } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import {
  oauthAccounts,
  type NewOAuthAccount,
  type OAuthAccount,
} from '../schema.js'

export async function findOAuthAccount(
  provider: string,
  providerAccountId: string,
): Promise<OAuthAccount | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(eq(oauthAccounts.provider, provider as 'google' | 'github'), eq(oauthAccounts.providerAccountId, providerAccountId)),
    )
    .limit(1)
  return rows[0]
}

export async function findOAuthAccountsByUserId(userId: string): Promise<OAuthAccount[]> {
  const db = getDb()
  return db.select().from(oauthAccounts).where(eq(oauthAccounts.userId, userId))
}

export async function upsertOAuthAccount(data: NewOAuthAccount): Promise<OAuthAccount> {
  const db = getDb()
  const rows = await db
    .insert(oauthAccounts)
    .values(data)
    .onConflictDoUpdate({
      target: [oauthAccounts.provider, oauthAccounts.providerAccountId],
      set: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        accessTokenExpiresAt: data.accessTokenExpiresAt ?? null,
        rawProfile: data.rawProfile ?? null,
        scope: data.scope ?? null,
        updatedAt: new Date(),
      },
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error('upsertOAuthAccount: no row returned')
  return row
}

export async function deleteOAuthAccount(id: string, userId: string): Promise<void> {
  const db = getDb()
  await db
    .delete(oauthAccounts)
    .where(and(eq(oauthAccounts.id, id), eq(oauthAccounts.userId, userId)))
}
