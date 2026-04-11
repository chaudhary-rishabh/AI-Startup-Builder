import { and, asc, count, eq, gt } from 'drizzle-orm'

import { conversationMessages } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { ConversationMessage, NewConversationMessage } from '../schema.js'

export async function findConversationMessages(
  projectId: string,
  phase: number,
  opts: { cursor?: string; limit?: number },
): Promise<{ data: ConversationMessage[]; nextCursor: string | null }> {
  const db = getDb()
  const limit = opts.limit ?? 50
  const cursorDate =
    opts.cursor !== undefined && opts.cursor !== '' ? new Date(opts.cursor) : undefined

  const whereClause = and(
    eq(conversationMessages.projectId, projectId),
    eq(conversationMessages.phase, phase),
    cursorDate && !Number.isNaN(cursorDate.getTime())
      ? gt(conversationMessages.createdAt, cursorDate)
      : undefined,
  )

  const rows = await db
    .select()
    .from(conversationMessages)
    .where(whereClause)
    .orderBy(asc(conversationMessages.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const nextCursor =
    hasMore && data.length > 0
      ? data[data.length - 1]!.createdAt.toISOString()
      : null

  return { data, nextCursor }
}

export async function appendMessage(
  data: NewConversationMessage,
): Promise<ConversationMessage> {
  const db = getDb()
  const [row] = await db.insert(conversationMessages).values(data).returning()
  if (!row) throw new Error('appendMessage: insert returned no row')
  return row
}

export async function deleteConversationsByProject(projectId: string): Promise<void> {
  const db = getDb()
  await db.delete(conversationMessages).where(eq(conversationMessages.projectId, projectId))
}

export async function countMessagesByProjectPhase(
  projectId: string,
  phase: number,
): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({ count: count() })
    .from(conversationMessages)
    .where(
      and(eq(conversationMessages.projectId, projectId), eq(conversationMessages.phase, phase)),
    )
  return Number(row?.count ?? 0)
}
