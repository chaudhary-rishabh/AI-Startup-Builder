import { paginate } from '@repo/db'
import { deletedAtNow, withActive } from '@repo/db'
import { and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'

import { projects } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { NewProject, Project } from '../schema.js'

const defaultPhaseProgress = {
  '1': 'active',
  '2': 'locked',
  '3': 'locked',
  '4': 'locked',
  '5': 'locked',
  '6': 'locked',
} as Record<string, string>

export function initialPhaseProgress(): Record<string, string> {
  return { ...defaultPhaseProgress }
}

export async function findProjectById(id: string): Promise<Project | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), withActive(projects.deletedAt)))
    .limit(1)
  return row
}

export async function findProjectByIdAndUserId(
  id: string,
  userId: string,
): Promise<Project | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, id), eq(projects.userId, userId), withActive(projects.deletedAt)),
    )
    .limit(1)
  return row
}

export async function findProjectsByUserId(
  userId: string,
  opts: {
    page: number
    limit: number
    status?: 'active' | 'archived' | 'all'
    isStarred?: boolean
    phase?: number
    sort?: 'lastActiveAt' | 'createdAt' | 'name'
    order?: 'asc' | 'desc'
  },
): Promise<{ data: Project[]; total: number }> {
  const db = getDb()
  const status = opts.status ?? 'active'
  const sort = opts.sort ?? 'lastActiveAt'
  const order = opts.order ?? 'desc'

  const statusCond =
    status === 'all'
      ? inArray(projects.status, ['active', 'archived', 'launched'])
      : status === 'archived'
        ? eq(projects.status, 'archived')
        : eq(projects.status, 'active')

  const baseWhere = and(
    eq(projects.userId, userId),
    withActive(projects.deletedAt),
    statusCond,
    opts.isStarred === undefined ? undefined : eq(projects.isStarred, opts.isStarred),
    opts.phase === undefined ? undefined : eq(projects.currentPhase, opts.phase),
  )

  const orderCol =
    sort === 'createdAt' ? projects.createdAt : sort === 'name' ? projects.name : projects.lastActiveAt
  const orderFn = order === 'asc' ? asc : desc

  const result = await paginate({
    page: opts.page,
    limit: opts.limit,
    dataFn: (limit, offset) =>
      db
        .select()
        .from(projects)
        .where(baseWhere)
        .orderBy(orderFn(orderCol))
        .limit(limit)
        .offset(offset),
    countFn: async () => {
      const [row] = await db
        .select({ count: count() })
        .from(projects)
        .where(baseWhere)
      return Number(row?.count ?? 0)
    },
  })

  return { data: result.data, total: result.meta.total }
}

export type ProjectSearchHit = Pick<
  Project,
  'id' | 'name' | 'emoji' | 'currentPhase' | 'isStarred' | 'status'
>

export async function searchProjectsByUserId(
  userId: string,
  query: string,
  limit = 10,
): Promise<ProjectSearchHit[]> {
  const db = getDb()
  const pattern = `%${query}%`
  return db
    .select({
      id: projects.id,
      name: projects.name,
      emoji: projects.emoji,
      currentPhase: projects.currentPhase,
      isStarred: projects.isStarred,
      status: projects.status,
    })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        withActive(projects.deletedAt),
        or(ilike(projects.name, pattern), ilike(projects.description, pattern)),
      ),
    )
    .limit(limit)
}

export async function createProject(data: NewProject): Promise<Project> {
  const db = getDb()
  const [row] = await db.insert(projects).values(data).returning()
  if (!row) throw new Error('createProject: insert returned no row')
  return row
}

export async function updateProject(
  id: string,
  userId: string,
  data: Partial<NewProject>,
): Promise<Project | undefined> {
  const db = getDb()
  const [row] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(projects.id, id), eq(projects.userId, userId), withActive(projects.deletedAt)),
    )
    .returning()
  return row
}

export async function softDeleteProject(
  id: string,
  userId: string,
): Promise<{ deleted: boolean; deletedAt: string | null }> {
  const db = getDb()
  const [row] = await db
    .update(projects)
    .set({
      deletedAt: deletedAtNow(),
      status: 'deleted',
      updatedAt: new Date(),
    })
    .where(
      and(eq(projects.id, id), eq(projects.userId, userId), withActive(projects.deletedAt)),
    )
    .returning({ deletedAt: projects.deletedAt })
  if (!row) return { deleted: false, deletedAt: null }
  return {
    deleted: true,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : new Date().toISOString(),
  }
}

export async function archiveProject(
  id: string,
  userId: string,
): Promise<Project | undefined> {
  const db = getDb()
  const [row] = await db
    .update(projects)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(
      and(
        eq(projects.id, id),
        eq(projects.userId, userId),
        eq(projects.status, 'active'),
        withActive(projects.deletedAt),
      ),
    )
    .returning()
  return row
}

export async function restoreProject(
  id: string,
  userId: string,
): Promise<Project | undefined> {
  const db = getDb()
  const [row] = await db
    .update(projects)
    .set({ status: 'active', updatedAt: new Date() })
    .where(
      and(
        eq(projects.id, id),
        eq(projects.userId, userId),
        eq(projects.status, 'archived'),
        withActive(projects.deletedAt),
      ),
    )
    .returning()
  return row
}

export async function toggleStar(id: string, userId: string): Promise<Project | undefined> {
  const existing = await findProjectByIdAndUserId(id, userId)
  if (!existing) return undefined
  const db = getDb()
  const [row] = await db
    .update(projects)
    .set({ isStarred: !existing.isStarred, updatedAt: new Date() })
    .where(
      and(eq(projects.id, id), eq(projects.userId, userId), withActive(projects.deletedAt)),
    )
    .returning()
  return row
}

export async function updateLastActive(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(projects)
    .set({ lastActiveAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, id))
}

export async function countActiveProjectsByUserId(userId: string): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({ count: count() })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.status, 'active'),
        withActive(projects.deletedAt),
      ),
    )
  return Number(row?.count ?? 0)
}

export async function duplicateProject(
  sourceId: string,
  userId: string,
  newName?: string,
): Promise<Project> {
  const source = await findProjectByIdAndUserId(sourceId, userId)
  if (!source) {
    throw new Error('duplicateProject: source not found')
  }
  return createProject({
    userId,
    name: newName ?? `${source.name} (Copy)`,
    emoji: source.emoji,
    description: source.description,
    currentPhase: 1,
    status: 'active',
    isStarred: false,
    mode: 'design',
    phaseProgress: initialPhaseProgress(),
  })
}

export async function findAllProjects(opts: {
  page: number
  limit: number
  userId?: string
  status?: string
  phase?: number
}): Promise<{ data: Project[]; total: number }> {
  const db = getDb()

  const baseWhere = and(
    withActive(projects.deletedAt),
    opts.userId ? eq(projects.userId, opts.userId) : undefined,
    opts.status ? eq(projects.status, opts.status as Project['status']) : undefined,
    opts.phase !== undefined ? eq(projects.currentPhase, opts.phase) : undefined,
  )

  const result = await paginate({
    page: opts.page,
    limit: opts.limit,
    dataFn: (limit, offset) =>
      db
        .select()
        .from(projects)
        .where(baseWhere)
        .orderBy(desc(projects.lastActiveAt))
        .limit(limit)
        .offset(offset),
    countFn: async () => {
      const [row] = await db
        .select({ count: count() })
        .from(projects)
        .where(baseWhere)
      return Number(row?.count ?? 0)
    },
  })

  return { data: result.data, total: result.meta.total }
}
