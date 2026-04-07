import { z } from 'zod'

export const CreateCheckoutSessionSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  billingCycle: z.enum(['monthly', 'yearly']),
  couponCode: z.string().trim().toUpperCase().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

export const ValidateCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Coupon code is required'),
})

export const AdminRefundSchema = z.object({
  transactionId: z.string().uuid(),
  // If omitted, full refund is issued
  amountCents: z.number().int().positive().optional(),
  reason: z.string().max(500),
})

export type CreateCheckoutInput = z.infer<typeof CreateCheckoutSessionSchema>
export type ValidateCouponInput = z.infer<typeof ValidateCouponSchema>
export type AdminRefundInput = z.infer<typeof AdminRefundSchema>
