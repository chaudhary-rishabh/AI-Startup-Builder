import { desc, eq } from 'drizzle-orm'

import { generationPlans } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { GenerationPlan, NewGenerationPlan } from '../schema.js'

export async function createGenerationPlan(data: NewGenerationPlan): Promise<GenerationPlan> {
  const db = getDb()
  const [row] = await db.insert(generationPlans).values(data).returning()
  if (!row) throw new Error('createGenerationPlan: insert returned no row')
  return row
}

export async function findPlanByProjectId(projectId: string): Promise<GenerationPlan | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(generationPlans)
    .where(eq(generationPlans.projectId, projectId))
    .orderBy(desc(generationPlans.createdAt))
    .limit(1)
  return row
}

export async function deletePlansByProjectId(projectId: string): Promise<void> {
  const db = getDb()
  await db.delete(generationPlans).where(eq(generationPlans.projectId, projectId))
}

export async function updatePlanProgress(
  projectId: string,
  patch: { completedBatches: number; status: string },
): Promise<void> {
  const plan = await findPlanByProjectId(projectId)
  if (!plan) return
  const db = getDb()
  await db
    .update(generationPlans)
    .set({
      completedBatches: patch.completedBatches,
      status: patch.status,
      updatedAt: new Date(),
    })
    .where(eq(generationPlans.id, plan.id))
}
