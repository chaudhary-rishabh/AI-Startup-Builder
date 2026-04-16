import { generateKeyPairSync } from 'node:crypto'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4007',
  DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString('base64'),
  JWT_PRIVATE_KEY_TEST_BASE64: Buffer.from(privateKey).toString('base64'),
  RESEND_API_KEY: 're_test_123',
  EMAIL_FROM: 'AI Startup Builder <no-reply@aistartupbuilder.com>',
  EMAIL_REPLY_TO: 'support@aistartupbuilder.com',
  APP_URL: 'http://localhost:3000',
  APP_NAME: 'AI Startup Builder',
})
