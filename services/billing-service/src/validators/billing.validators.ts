import { z } from 'zod'

export const RazorpayCheckoutSchema = z.object({
  plan: z.enum(['starter', 'pro', 'team']),
  billingCycle: z.enum(['monthly', 'yearly']),
  couponCode: z.string().optional(),
})

export const TopUpOrderSchema = z.object({
  packName: z.enum(['starter_pack', 'builder_pack', 'studio_pack']),
})

export const TopUpVerifySchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

export const AdminGrantCreditsSchema = z.object({
  userId: z.string().uuid(),
  tokensToGrant: z.number().int().positive().max(10_000_000),
  reason: z.string().min(5).max(500),
})
