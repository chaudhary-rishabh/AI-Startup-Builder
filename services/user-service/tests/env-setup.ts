/**
 * Runs before any `src/` imports so `config/env.ts` parses valid values.
 */
import { generateKeyPairSync } from 'node:crypto'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4002',
  DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString('base64'),
  JWT_PRIVATE_KEY_TEST_BASE64: Buffer.from(privateKey).toString('base64'),
  AWS_REGION: 'us-east-1',
  AWS_S3_BUCKET_UPLOADS: process.env['AWS_S3_BUCKET_UPLOADS'] ?? 'test-uploads-bucket',
  AUTH_SERVICE_URL: process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:4001',
})
