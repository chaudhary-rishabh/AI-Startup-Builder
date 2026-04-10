import { paginate } from '@repo/db'
import { and, asc, count, desc, eq, ilike } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import {
  userProfiles,
  type NewUserProfile,
  type UserProfile,
} from '../schema.js'

export async function findProfileById(userId: string): Promise<UserProfile | undefined> {
  const db = getDb()
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1)
  return rows[0]
}

export async function createProfile(data: NewUserProfile): Promise<UserProfile> {
  const db = getDb()
  const rows = await db.insert(userProfiles).values(data).returning()
  const row = rows[0]
  if (!row) throw new Error('createProfile: no row returned')
  return row
}

export async function updateProfile(
  userId: string,
  data: Partial<NewUserProfile>,
): Promise<UserProfile | undefined> {
  const db = getDb()
  const patch = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  ) as Partial<NewUserProfile>
  if (Object.keys(patch).length === 0) {
    return findProfileById(userId)
  }
  const rows = await db
    .update(userProfiles)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(userProfiles.id, userId))
    .returning()
  return rows[0]
}

export async function deleteProfile(userId: string): Promise<void> {
  const db = getDb()
  await db.delete(userProfiles).where(eq(userProfiles.id, userId))
}

export async function findAllProfiles(opts: {
  page: number
  limit: number
  search?: string
  roleType?: string
  sort?: 'createdAt' | 'companyName'
  order?: 'asc' | 'desc'
}): Promise<{ data: UserProfile[]; total: number }> {
  const db = getDb()
  const conditions = []
  if (opts.search?.trim()) {
    conditions.push(ilike(userProfiles.companyName, `%${opts.search.trim()}%`))
  }
  if (opts.roleType) {
    conditions.push(eq(userProfiles.roleType, opts.roleType as NonNullable<UserProfile['roleType']>))
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const sortCol =
    opts.sort === 'companyName' ? userProfiles.companyName : userProfiles.createdAt
  const orderFn = opts.order === 'desc' ? desc(sortCol) : asc(sortCol)

  const result = await paginate({
    page: opts.page,
    limit: opts.limit,
    dataFn: (limit, offset) => {
      const base = db.select().from(userProfiles)
      const filtered = whereClause ? base.where(whereClause) : base
      return filtered.orderBy(orderFn).limit(limit).offset(offset)
    },
    countFn: async () => {
      const base = db.select({ count: count() }).from(userProfiles)
      const filtered = whereClause ? base.where(whereClause) : base
      const rows = await filtered
      return Number(rows[0]?.count ?? 0)
    },
  })

  return { data: result.data, total: result.meta.total }
}
