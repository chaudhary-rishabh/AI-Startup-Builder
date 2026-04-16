import { and, eq, sql } from 'drizzle-orm'

import { coupons } from '../schema.js'
import { getDb } from '../../lib/db.js'
import { AppError } from '../../lib/errors.js'

import type { Coupon } from '../schema.js'

export async function findCouponByCode(code: string): Promise<Coupon | undefined> {
  const db = getDb()
  const normalized = code.toUpperCase().trim()
  const [row] = await db.select().from(coupons).where(eq(coupons.code, normalized)).limit(1)
  return row
}

export async function incrementCouponUsage(id: string): Promise<void> {
  const db = getDb()
  const updated = await db
    .update(coupons)
    .set({ usedCount: sql`used_count + 1` })
    .where(and(eq(coupons.id, id), sql`(max_uses IS NULL OR used_count < max_uses)`))
    .returning({ id: coupons.id })
  if (updated.length === 0) {
    throw new AppError('COUPON_MAX_USES_REACHED', 'Coupon max uses reached', 422)
  }
}

export async function findCouponByStripeId(stripeCouponId: string): Promise<Coupon | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.stripeCouponId, stripeCouponId))
    .limit(1)
  return row
}
