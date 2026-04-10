import { eq } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import {
  onboardingState,
  type NewOnboardingState,
  type OnboardingState,
} from '../schema.js'

export async function findOnboardingByUserId(userId: string): Promise<OnboardingState | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(onboardingState)
    .where(eq(onboardingState.userId, userId))
    .limit(1)
  return rows[0]
}

export async function createOnboardingState(userId: string): Promise<OnboardingState> {
  const db = getDb()
  const rows = await db
    .insert(onboardingState)
    .values({
      userId,
      currentStep: 'profile',
      completedSteps: [],
      stepData: {},
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error('createOnboardingState: no row returned')
  return row
}

export async function updateOnboardingState(
  userId: string,
  data: Partial<NewOnboardingState>,
): Promise<OnboardingState | undefined> {
  const db = getDb()
  const patch = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  ) as Partial<NewOnboardingState>
  if (Object.keys(patch).length === 0) {
    return findOnboardingByUserId(userId)
  }
  const rows = await db
    .update(onboardingState)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(onboardingState.userId, userId))
    .returning()
  return rows[0]
}

export async function markOnboardingComplete(userId: string): Promise<OnboardingState | undefined> {
  const db = getDb()
  const rows = await db
    .update(onboardingState)
    .set({
      currentStep: 'complete',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(onboardingState.userId, userId))
    .returning()
  return rows[0]
}
