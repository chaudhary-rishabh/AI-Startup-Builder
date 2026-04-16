import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4007),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_PUBLIC_KEY_BASE64: z.string().min(1),
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_FROM: z.string().default('AI Startup Builder <no-reply@aistartupbuilder.com>'),
  EMAIL_REPLY_TO: z.string().email().default('support@aistartupbuilder.com'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  APP_NAME: z.string().default('AI Startup Builder'),
  EMAIL_WORKER_CONCURRENCY: z.coerce.number().default(5),
  NOTIFICATION_WORKER_CONCURRENCY: z.coerce.number().default(10),
  UNREAD_COUNT_CACHE_TTL: z.coerce.number().default(10),
  PREFS_CACHE_TTL: z.coerce.number().default(120),
  EMAIL_DEDUP_TTL: z.coerce.number().default(3600),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('[notification-service] Invalid environment:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
