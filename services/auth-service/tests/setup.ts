/**
 * Vitest runs this file before test files. All auth-service env vars must be
 * present before importing modules that load `src/config/env.ts`.
 */
const baseUrl =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup'

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4001',
  DATABASE_URL: baseUrl,
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  JWT_PRIVATE_KEY_BASE64:
    process.env['JWT_PRIVATE_KEY_BASE64'] ?? Buffer.from('test-private-placeholder').toString('base64'),
  JWT_PUBLIC_KEY_BASE64:
    process.env['JWT_PUBLIC_KEY_BASE64'] ?? Buffer.from('test-public-placeholder').toString('base64'),
  GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID'] ?? 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: process.env['GOOGLE_CLIENT_SECRET'] ?? 'test-google-client-secret',
  GOOGLE_REDIRECT_URI: process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:3000/auth/callback',
})
