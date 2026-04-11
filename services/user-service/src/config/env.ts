import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4002),
  DATABASE_URL: z.string().url(),
  DATABASE_READ_REPLICA_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  JWT_PUBLIC_KEY_BASE64: z.string().min(1),
  API_KEY_HMAC_SECRET: z.string().min(32, 'Must be at least 32 chars'),
  INTEGRATION_ENCRYPTION_KEY: z
    .string()
    .transform((s) => s.toLowerCase())
    .pipe(z.string().regex(/^[0-9a-f]{64}$/, 'Must be 64 hex chars')),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET_UPLOADS: z.string().min(1),
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:4001'),
})

let _env: z.infer<typeof EnvSchema>

try {
  _env = EnvSchema.parse(process.env)
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error('[user-service] Environment validation failed:')
    for (const issue of err.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  throw err
}

export const env = _env
