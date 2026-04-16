import { and, desc, eq, gt } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import { emailLogs } from '../schema.js'

import type { EmailLog, NewEmailLog } from '../schema.js'

export async function createEmailLog(data: NewEmailLog): Promise<EmailLog> {
  const db = getDb()
  const [row] = await db.insert(emailLogs).values(data).returning()
  if (!row) throw new Error('createEmailLog: insert returned no row')
  return row
}

export async function updateEmailLogStatus(
  resendMessageId: string,
  data: {
    status: string
    openedAt?: Date
    errorMessage?: string
  },
): Promise<void> {
  const db = getDb()
  await db
    .update(emailLogs)
    .set({
      status: data.status,
      ...(data.openedAt !== undefined ? { openedAt: data.openedAt } : {}),
      ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
    })
    .where(eq(emailLogs.resendMessageId, resendMessageId))
}

export async function findRecentEmailLog(
  toEmail: string,
  template: string,
  withinSeconds: number,
): Promise<EmailLog | undefined> {
  const db = getDb()
  const threshold = new Date(Date.now() - withinSeconds * 1000)
  const [row] = await db
    .select()
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.toEmail, toEmail),
        eq(emailLogs.template, template),
        gt(emailLogs.createdAt, threshold),
      ),
    )
    .orderBy(desc(emailLogs.createdAt))
    .limit(1)
  return row
}
