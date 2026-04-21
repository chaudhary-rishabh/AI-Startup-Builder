import { and, count, desc, eq, lte, sql } from 'drizzle-orm'

import { plans, subscriptions } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { NewSubscription, Plan, Subscription } from '../schema.js'

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan
}

export interface UpsertSubscription
  extends Omit<
    NewSubscription,
    'id' | 'createdAt' | 'updatedAt' | 'cancelAtPeriodEnd' | 'status'
  > {
  status: Subscription['status']
  cancelAtPeriodEnd?: boolean
}

export async function findSubscriptionByUserId(
  userId: string,
): Promise<SubscriptionWithPlan | undefined> {
  const db = getDb()
  const rows = await db
    .select({
      sub: subscriptions,
      plan: plans,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.userId, userId))
    .limit(1)
  const row = rows[0]
  if (!row) return undefined
  return { ...row.sub, plan: row.plan }
}

export async function findSubscriptionByRazorpayCustomerId(
  customerId: string,
): Promise<Subscription | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.razorpayCustomerId, customerId))
    .limit(1)
  return row
}

export async function findSubscriptionByRazorpaySubscriptionId(
  subId: string,
): Promise<Subscription | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.razorpaySubscriptionId, subId))
    .limit(1)
  return row
}

/** @deprecated legacy name — use findSubscriptionByRazorpayCustomerId */
export const findSubscriptionByStripeCustomerId = findSubscriptionByRazorpayCustomerId

/** @deprecated legacy name */
export const findSubscriptionByStripeSubscriptionId = findSubscriptionByRazorpaySubscriptionId

export async function upsertSubscription(data: UpsertSubscription): Promise<Subscription> {
  const db = getDb()
  const [row] = await db
    .insert(subscriptions)
    .values({
      userId: data.userId,
      planId: data.planId,
      razorpayCustomerId: data.razorpayCustomerId,
      razorpaySubscriptionId: data.razorpaySubscriptionId ?? null,
      status: data.status,
      billingCycle: data.billingCycle ?? null,
      currentPeriodStart: data.currentPeriodStart ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      cancelledAt: data.cancelledAt ?? null,
      trialEnd: data.trialEnd ?? null,
      signupCreditsGranted: data.signupCreditsGranted ?? false,
      isOneTimeCredits: data.isOneTimeCredits ?? false,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        planId: data.planId,
        razorpayCustomerId: data.razorpayCustomerId,
        razorpaySubscriptionId: data.razorpaySubscriptionId ?? null,
        status: data.status,
        billingCycle: data.billingCycle ?? null,
        currentPeriodStart: data.currentPeriodStart ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        cancelledAt: data.cancelledAt ?? null,
        trialEnd: data.trialEnd ?? null,
        signupCreditsGranted: data.signupCreditsGranted ?? false,
        isOneTimeCredits: data.isOneTimeCredits ?? false,
        updatedAt: new Date(),
      },
    })
    .returning()
  if (!row) throw new Error('upsertSubscription: no row')
  return row
}

export async function updateSubscriptionStatus(
  userId: string,
  data: {
    status?: string
    razorpaySubscriptionId?: string | null
    currentPeriodStart?: Date | null
    currentPeriodEnd?: Date | null
    cancelAtPeriodEnd?: boolean
    cancelledAt?: Date | null
    trialEnd?: Date | null
    planId?: string
    billingCycle?: string | null
    signupCreditsGranted?: boolean
    isOneTimeCredits?: boolean
  },
): Promise<Subscription> {
  const db = getDb()
  const [row] = await db
    .update(subscriptions)
    .set({
      ...(data.status !== undefined ? { status: data.status as Subscription['status'] } : {}),
      ...(data.razorpaySubscriptionId !== undefined
        ? { razorpaySubscriptionId: data.razorpaySubscriptionId }
        : {}),
      ...(data.currentPeriodStart !== undefined ? { currentPeriodStart: data.currentPeriodStart } : {}),
      ...(data.currentPeriodEnd !== undefined ? { currentPeriodEnd: data.currentPeriodEnd } : {}),
      ...(data.cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd: data.cancelAtPeriodEnd } : {}),
      ...(data.cancelledAt !== undefined ? { cancelledAt: data.cancelledAt } : {}),
      ...(data.trialEnd !== undefined ? { trialEnd: data.trialEnd } : {}),
      ...(data.planId !== undefined ? { planId: data.planId } : {}),
      ...(data.billingCycle !== undefined ? { billingCycle: data.billingCycle } : {}),
      ...(data.signupCreditsGranted !== undefined ? { signupCreditsGranted: data.signupCreditsGranted } : {}),
      ...(data.isOneTimeCredits !== undefined ? { isOneTimeCredits: data.isOneTimeCredits } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId))
    .returning()
  if (!row) throw new Error('updateSubscriptionStatus: subscription not found')
  return row
}

export async function findSubscriptionsExpiringSoon(withinHours: number): Promise<Subscription[]> {
  const db = getDb()
  const horizon = new Date(Date.now() + withinHours * 60 * 60 * 1000)
  return db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.cancelAtPeriodEnd, true),
        lte(subscriptions.currentPeriodEnd, horizon),
        eq(subscriptions.status, 'active'),
      ),
    )
    .orderBy(desc(subscriptions.currentPeriodEnd))
}

export async function countSubscriptions(): Promise<number> {
  const db = getDb()
  const [r] = await db.select({ c: count() }).from(subscriptions)
  return Number(r?.c ?? 0)
}

export async function getPlanNameForUser(userId: string): Promise<string> {
  const db = getDb()
  const rows = await db
    .select({
      name: plans.name,
      tokenLimitMonthly: plans.tokenLimitMonthly,
      expr: sql`1`,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.userId, userId))
    .limit(1)
  return rows[0]?.name ?? 'free'
}
