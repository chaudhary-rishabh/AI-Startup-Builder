/**
 * Runs before any `src/` imports so `config/env.ts` parses valid values (incl. real RSA PEM in base64).
 */
import { generateKeyPairSync, randomBytes } from 'node:crypto'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const baseUrl =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup'

const mfaKey = process.env['MFA_ENCRYPTION_KEY'] ?? randomBytes(32).toString('hex')

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4001',
  DATABASE_URL: baseUrl,
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  FRONTEND_APP_URL: process.env['FRONTEND_APP_URL'] ?? 'http://localhost:3000',
  MFA_ENCRYPTION_KEY: mfaKey,
  JWT_PRIVATE_KEY_BASE64: Buffer.from(privateKey).toString('base64'),
  JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString('base64'),
  JWT_ACCESS_TOKEN_TTL: '2',
  JWT_REFRESH_TOKEN_TTL: '86400',
  GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID'] ?? 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: process.env['GOOGLE_CLIENT_SECRET'] ?? 'test-google-client-secret',
  GOOGLE_REDIRECT_URI: process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:3000/auth/callback',
  BCRYPT_ROUNDS: '4',
  BRUTE_FORCE_MAX_ATTEMPTS: '3',
  BRUTE_FORCE_LOCK_MINUTES: '15',
})
