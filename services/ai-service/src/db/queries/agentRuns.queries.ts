import { paginate } from '@repo/db'
import { and, count, desc, eq, gte, inArray, lt } from 'drizzle-orm'

import { agentRuns } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { AgentRun, NewAgentRun } from '../schema.js'

export class ImmutabilityError extends Error {
  constructor(message = 'Agent run is immutable in terminal state') {
    super(message)
    this.name = 'ImmutabilityError'
  }
}

const terminalStatuses = ['completed', 'failed', 'cancelled'] as const

function isTerminal(status: string): boolean {
  return (terminalStatuses as readonly string[]).includes(status)
}

export async function createAgentRun(data: NewAgentRun): Promise<AgentRun> {
  const db = getDb()
  const [row] = await db.insert(agentRuns).values(data).returning()
  if (!row) throw new Error('createAgentRun: insert returned no row')
  return row
}

export async function updateAgentRunStatus(
  id: string,
  data: Partial<
    Pick<
      AgentRun,
      | 'status'
      | 'promptTokens'
      | 'completionTokens'
      | 'totalTokens'
      | 'costUsd'
      | 'durationMs'
      | 'errorMessage'
      | 'errorCode'
      | 'ragContextUsed'
      | 'ragChunksInjected'
      | 'contextTokensEstimate'
      | 'wasContextCompressed'
      | 'docInjectionMode'
      | 'startedAt'
      | 'completedAt'
    >
  >,
): Promise<AgentRun | undefined> {
  const db = getDb()
  const [existing] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1)
  if (!existing) return undefined

  if (isTerminal(existing.status)) {
    throw new ImmutabilityError()
  }

  const [row] = await db.update(agentRuns).set(data).where(eq(agentRuns.id, id)).returning()
  return row
}

export async function findAgentRunById(id: string): Promise<AgentRun | undefined> {
  const db = getDb()
  const [row] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1)
  return row
}

export async function findAgentRunsByProject(
  projectId: string,
  opts: { page: number; limit: number; phase?: number; userId?: string },
): Promise<{ data: AgentRun[]; total: number }> {
  const db = getDb()
  const baseWhere = and(
    eq(agentRuns.projectId, projectId),
    opts.phase !== undefined ? eq(agentRuns.phase, opts.phase) : undefined,
    opts.userId !== undefined ? eq(agentRuns.userId, opts.userId) : undefined,
  )

  const result = await paginate({
    page: opts.page,
    limit: opts.limit,
    dataFn: (limit, offset) =>
      db
        .select()
        .from(agentRuns)
        .where(baseWhere)
        .orderBy(desc(agentRuns.createdAt))
        .limit(limit)
        .offset(offset),
    countFn: async () => {
      const [r] = await db.select({ count: count() }).from(agentRuns).where(baseWhere)
      return Number(r?.count ?? 0)
    },
  })
  return { data: result.data, total: result.meta.total }
}

export async function findActiveRunsByUser(userId: string): Promise<AgentRun[]> {
  const db = getDb()
  return db
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.userId, userId), inArray(agentRuns.status, ['pending', 'running'])))
}

export async function findActiveRunsByProject(
  projectId: string,
  phase: number,
): Promise<AgentRun[]> {
  const db = getDb()
  return db
    .select()
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.projectId, projectId),
        eq(agentRuns.phase, phase),
        inArray(agentRuns.status, ['pending', 'running']),
      ),
    )
}

export async function cancelAgentRun(id: string): Promise<AgentRun | undefined> {
  const db = getDb()
  const [existing] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1)
  if (!existing) return undefined
  if (isTerminal(existing.status)) {
    return existing
  }
  const [row] = await db
    .update(agentRuns)
    .set({ status: 'cancelled', completedAt: new Date() })
    .where(eq(agentRuns.id, id))
    .returning()
  return row
}

export async function findAgentRunsByUserMonth(
  userId: string,
  month: Date,
): Promise<AgentRun[]> {
  const db = getDb()
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  return db
    .select()
    .from(agentRuns)
    .where(
      and(eq(agentRuns.userId, userId), gte(agentRuns.createdAt, start), lt(agentRuns.createdAt, end)),
    )
    .orderBy(desc(agentRuns.createdAt))
}
