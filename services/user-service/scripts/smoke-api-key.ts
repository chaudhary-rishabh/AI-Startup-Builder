/**
 * Smoke: POST /users/me/api-keys with real JWT, Postgres, and Redis (no mocks).
 * Prereqs: docker compose up -d postgres redis (or equivalent), then pnpm db:migrate.
 */
import { generateKeyPairSync, randomUUID } from 'node:crypto'

import { importPKCS8, SignJWT } from 'jose'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

Object.assign(process.env, {
  NODE_ENV: 'development',
  DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://:devpassword@127.0.0.1:6379',
  JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString('base64'),
  API_KEY_HMAC_SECRET:
    process.env['API_KEY_HMAC_SECRET'] ??
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab',
  INTEGRATION_ENCRYPTION_KEY:
    process.env['INTEGRATION_ENCRYPTION_KEY'] ??
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  AWS_REGION: 'us-east-1',
  AWS_S3_BUCKET_UPLOADS: 'smoke-bucket',
  AUTH_SERVICE_URL: 'http://127.0.0.1:4001',
})

const privateKeyPem = Buffer.from(privateKey).toString('utf8')
const signingKey = await importPKCS8(privateKeyPem, 'RS256')
const sub = randomUUID()
const token = await new SignJWT({
  sub,
  role: 'user',
  plan: 'free',
  type: 'access',
})
  .setProtectedHeader({ alg: 'RS256' })
  .setIssuer('ai-startup-builder')
  .setAudience('ai-startup-builder-api')
  .setIssuedAt()
  .setExpirationTime('10m')
  .sign(signingKey)

const { createApp } = await import('../src/app.js')
const app = createApp()
const res = await app.request('http://localhost/users/me/api-keys', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'Test Key', scopes: ['read'] }),
})

if (res.status !== 201) {
  console.error('Expected 201, got', res.status, await res.text())
  process.exit(1)
}

const body = (await res.json()) as {
  success: boolean
  data: { key?: string; warning?: string; keyHash?: string }
}

const apiKeyPrefix = `${['sk', 'live'].join('_')}_`
if (!body.data.key?.startsWith(apiKeyPrefix)) {
  console.error('Expected key with platform API prefix', body)
  process.exit(1)
}
if (!body.data.warning) {
  console.error('Expected warning field', body)
  process.exit(1)
}
if ('keyHash' in body.data) {
  console.error('Response must not include keyHash', body)
  process.exit(1)
}

console.log('Smoke OK: POST /users/me/api-keys')
