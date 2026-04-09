import { withActive, deletedAtNow } from '@repo/db'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import { users, type NewUser, type User } from '../schema.js'

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), withActive(users.deletedAt)))
    .limit(1)
  return rows[0]
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), withActive(users.deletedAt)))
    .limit(1)
  return rows[0]
}

export async function findUserByEmailVerificationToken(token: string): Promise<User | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1)
  return rows[0]
}

export async function findUserByPasswordResetToken(token: string): Promise<User | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(users)
    .where(
      and(eq(users.passwordResetToken, token), gt(users.passwordResetExpiresAt, sql`NOW()`)),
    )
    .limit(1)
  return rows[0]
}

export async function createUser(data: NewUser): Promise<User> {
  const db = getDb()
  const rows = await db.insert(users).values(data).returning()
  const row = rows[0]
  if (!row) throw new Error('createUser: insert returned no row')
  return row
}

export async function updateUser(id: string, data: Partial<NewUser>): Promise<User | undefined> {
  const db = getDb()
  const patch = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  ) as Partial<NewUser>
  if (Object.keys(patch).length === 0) {
    return findUserById(id)
  }
  const rows = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(users.id, id), withActive(users.deletedAt)))
    .returning()
  return rows[0]
}

export async function softDeleteUser(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(users)
    .set({ deletedAt: deletedAtNow(), updatedAt: new Date() })
    .where(eq(users.id, id))
}

export async function incrementFailedLoginAttempts(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(users)
    .set({
      failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
}

export async function lockUserAccount(id: string, lockUntil: Date): Promise<void> {
  const db = getDb()
  await db
    .update(users)
    .set({
      lockedUntil: lockUntil,
      failedLoginAttempts: 0,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
}

export async function resetFailedLoginAttempts(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
}

export async function updateLastActive(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(users)
    .set({
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
}
