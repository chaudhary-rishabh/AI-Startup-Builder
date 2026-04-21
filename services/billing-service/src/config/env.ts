import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4006),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_PUBLIC_KEY_BASE64: z.string().min(1),

  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  RAZORPAY_STARTER_MONTHLY_PLAN_ID: z.string().min(1),
  RAZORPAY_STARTER_YEARLY_PLAN_ID: z.string().min(1),
  RAZORPAY_PRO_MONTHLY_PLAN_ID: z.string().min(1),
  RAZORPAY_PRO_YEARLY_PLAN_ID: z.string().min(1),
  RAZORPAY_TEAM_MONTHLY_PLAN_ID: z.string().min(1),
  RAZORPAY_TEAM_YEARLY_PLAN_ID: z.string().min(1),

  FREE_PLAN_SIGNUP_TOKENS: z.coerce.number().default(50_000),

  APP_URL: z.string().url().default('http://localhost:3000'),

  TOKEN_WARNING_THRESHOLD_1: z.coerce.number().default(80),
  TOKEN_WARNING_THRESHOLD_2: z.coerce.number().default(95),

  PLANS_CACHE_TTL: z.coerce.number().default(300),
  SUBSCRIPTION_CACHE_TTL: z.coerce.number().default(60),
  TOKEN_BUDGET_CACHE_TTL: z.coerce.number().default(10),

  WEBHOOK_IDEMPOTENCY_TTL: z.coerce.number().default(86400),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('[billing-service] Invalid environment:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
