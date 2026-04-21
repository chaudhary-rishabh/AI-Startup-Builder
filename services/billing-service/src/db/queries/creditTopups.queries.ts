import { and, eq } from 'drizzle-orm'

import { creditTopups } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { CreditTopup, NewCreditTopup } from '../schema.js'

export async function insertCreditTopupPending(data: NewCreditTopup): Promise<CreditTopup> {
  const db = getDb()
  const [row] = await db.insert(creditTopups).values(data).returning()
  if (!row) throw new Error('insertCreditTopupPending: no row')
  return row
}

export async function findCreditTopupByOrderId(orderId: string): Promise<CreditTopup | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(creditTopups)
    .where(eq(creditTopups.razorpayOrderId, orderId))
    .limit(1)
  return row
}

export async function updateCreditTopupCaptured(
  orderId: string,
  data: { razorpayPaymentId: string; completedAt: Date },
): Promise<CreditTopup> {
  const db = getDb()
  const [row] = await db
    .update(creditTopups)
    .set({
      razorpayPaymentId: data.razorpayPaymentId,
      status: 'captured',
      completedAt: data.completedAt,
    })
    .where(eq(creditTopups.razorpayOrderId, orderId))
    .returning()
  if (!row) throw new Error('updateCreditTopupCaptured: not found')
  return row
}

