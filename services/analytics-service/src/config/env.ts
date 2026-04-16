import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4008),
  DATABASE_URL: z.string().url(),
  DATABASE_READ_REPLICA_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  JWT_PUBLIC_KEY_BASE64: z.string().min(1),
  KPI_CACHE_TTL: z.coerce.number().default(300),
  FUNNEL_CACHE_TTL: z.coerce.number().default(300),
  TOKEN_USAGE_CACHE_TTL: z.coerce.number().default(120),
  AGENT_PERF_CACHE_TTL: z.coerce.number().default(120),
  MY_USAGE_CACHE_TTL: z.coerce.number().default(60),
  REVENUE_CACHE_TTL: z.coerce.number().default(300),
  USER_TIMELINE_CACHE_TTL: z.coerce.number().default(60),
  MAX_DATE_RANGE_DAYS: z.coerce.number().default(365),
  WEEKLY_DIGEST_ENABLED: z.coerce.boolean().default(false),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('[analytics-service] Invalid environment:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
