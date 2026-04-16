import { and, asc, eq } from 'drizzle-orm'

import { plans } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { Plan } from '../schema.js'

export async function findAllActivePlans(): Promise<Plan[]> {
  const db = getDb()
  return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.sortOrder))
}

export async function findPlanByName(name: string): Promise<Plan | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.name, name.toLowerCase()), eq(plans.isActive, true)))
    .limit(1)
  return row
}

export async function findPlanById(id: string): Promise<Plan | undefined> {
  const db = getDb()
  const [row] = await db.select().from(plans).where(eq(plans.id, id)).limit(1)
  return row
}

export async function updateStripePriceIds(
  planId: string,
  data: {
    stripePriceMonthlyId?: string
    stripePriceYearlyId?: string
    stripeProductId?: string
  },
): Promise<Plan> {
  const db = getDb()
  const [row] = await db
    .update(plans)
    .set({
      ...(data.stripePriceMonthlyId !== undefined
        ? { stripePriceMonthlyId: data.stripePriceMonthlyId }
        : {}),
      ...(data.stripePriceYearlyId !== undefined
        ? { stripePriceYearlyId: data.stripePriceYearlyId }
        : {}),
      ...(data.stripeProductId !== undefined ? { stripeProductId: data.stripeProductId } : {}),
    })
    .where(eq(plans.id, planId))
    .returning()
  if (!row) throw new Error('updateStripePriceIds: plan not found')
  return row
}
