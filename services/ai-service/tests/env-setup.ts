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
  PORT: '4004',
  DATABASE_URL:
    process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString('base64'),
  JWT_PRIVATE_KEY_TEST_BASE64: Buffer.from(privateKey).toString('base64'),
  MINIMAX_API_KEY: process.env['MINIMAX_API_KEY'] ?? 'minimax-test',
  MINIMAX_BASE_URL: process.env['MINIMAX_BASE_URL'] ?? 'https://api.minimax.chat/v1',
  MINIMAX_MODEL: process.env['MINIMAX_MODEL'] ?? 'MiniMax-M2.7',
  DEEPSEEK_API_KEY: process.env['DEEPSEEK_API_KEY'] ?? 'deepseek-test',
  DEEPSEEK_BASE_URL: process.env['DEEPSEEK_BASE_URL'] ?? 'https://api.deepseek.com/v1',
  DEEPSEEK_MODEL: process.env['DEEPSEEK_MODEL'] ?? 'deepseek-v4-flash',
  DEEPSEEK_R1_API_KEY: process.env['DEEPSEEK_R1_API_KEY'] ?? 'deepseek-test',
  DEEPSEEK_R1_BASE_URL: process.env['DEEPSEEK_R1_BASE_URL'] ?? 'https://api.deepseek.com/v1',
  DEEPSEEK_R1_MODEL: process.env['DEEPSEEK_R1_MODEL'] ?? 'deepseek-reasoner',
  GEMINI_API_KEY: process.env['GEMINI_API_KEY'] ?? 'gemini-test',
  GEMINI_MODEL: process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash',
  COHERE_API_KEY: process.env['COHERE_API_KEY'] ?? 'cohere-test',
  PROJECT_SERVICE_URL: process.env['PROJECT_SERVICE_URL'] ?? 'http://localhost:4003',
  BILLING_SERVICE_URL: process.env['BILLING_SERVICE_URL'] ?? 'http://localhost:4006',
  RAG_SERVICE_URL: process.env['RAG_SERVICE_URL'] ?? 'http://localhost:4005',
})
