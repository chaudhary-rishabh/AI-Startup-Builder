import { and, desc, eq } from 'drizzle-orm'

import { promptTemplates } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { NewPromptTemplate, PromptTemplate } from '../schema.js'

export async function findActiveTemplate(agentType: string): Promise<PromptTemplate | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(promptTemplates)
    .where(and(eq(promptTemplates.agentType, agentType), eq(promptTemplates.isActive, true)))
    .orderBy(desc(promptTemplates.version))
    .limit(1)
  return row
}

export async function findAllTemplates(phase?: number): Promise<PromptTemplate[]> {
  const db = getDb()
  if (phase !== undefined) {
    return db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.phase, phase))
      .orderBy(desc(promptTemplates.updatedAt))
  }
  return db.select().from(promptTemplates).orderBy(desc(promptTemplates.updatedAt))
}

export async function upsertTemplate(data: NewPromptTemplate): Promise<PromptTemplate> {
  const db = getDb()
  await db
    .update(promptTemplates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(eq(promptTemplates.agentType, data.agentType), eq(promptTemplates.isActive, true)),
    )

  const [row] = await db
    .insert(promptTemplates)
    .values({
      ...data,
      isActive: true,
      version: data.version ?? 1,
    })
    .returning()
  if (!row) throw new Error('upsertTemplate: insert returned no row')
  return row
}
