import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4001),
  DATABASE_URL: z.string().url(),
  DATABASE_READ_REPLICA_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  JWT_PRIVATE_KEY_BASE64: z.string().min(1),
  JWT_PUBLIC_KEY_BASE64: z.string().min(1),
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(604_800),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  BRUTE_FORCE_MAX_ATTEMPTS: z.coerce.number().default(3),
  BRUTE_FORCE_LOCK_MINUTES: z.coerce.number().default(15),
})

let _env: z.infer<typeof EnvSchema>

try {
  _env = EnvSchema.parse(process.env)
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error('[auth-service] Environment validation failed:')
    for (const issue of err.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  throw err
}

export const env = _env
