import { generateKeyPairSync } from 'node:crypto'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4006',
  DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString('base64'),
  JWT_PRIVATE_KEY_TEST_BASE64: Buffer.from(privateKey).toString('base64'),
  RAZORPAY_KEY_ID: 'rzp_test_123',
  RAZORPAY_KEY_SECRET: 'secret_test_123',
  RAZORPAY_WEBHOOK_SECRET: 'whsec_test_razorpay',
  RAZORPAY_STARTER_MONTHLY_PLAN_ID: 'plan_starter_monthly',
  RAZORPAY_STARTER_YEARLY_PLAN_ID: 'plan_starter_yearly',
  RAZORPAY_PRO_MONTHLY_PLAN_ID: 'plan_pro_monthly',
  RAZORPAY_PRO_YEARLY_PLAN_ID: 'plan_pro_yearly',
  RAZORPAY_TEAM_MONTHLY_PLAN_ID: 'plan_team_monthly',
  RAZORPAY_TEAM_YEARLY_PLAN_ID: 'plan_team_yearly',
  FREE_PLAN_SIGNUP_TOKENS: '50000',
  APP_URL: 'http://localhost:3000',
})
