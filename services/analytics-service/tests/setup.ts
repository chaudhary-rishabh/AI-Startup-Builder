import { generateKeyPairSync } from 'node:crypto'

import Redis from 'ioredis-mock'
import { beforeEach, vi } from 'vitest'

import { setRedisForTests, getRedis } from '../src/lib/redis.js'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4008',
  DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup',
  DATABASE_READ_REPLICA_URL:
    process.env['DATABASE_READ_REPLICA_URL'] ??
    process.env['DATABASE_URL'] ??
    'postgresql://postgres:devpassword@localhost:5432/aistartup',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
  JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString('base64'),
  JWT_PRIVATE_KEY_TEST_BASE64: Buffer.from(privateKey).toString('base64'),
})

setRedisForTests(new Redis() as never)

beforeEach(async () => {
  await getRedis().flushall()
})

const queues = new Map<string, Array<{ name: string; data: Record<string, unknown> }>>()

vi.mock('bullmq', () => {
  class QueueMock {
    name: string
    constructor(name: string) {
      this.name = name
      if (!queues.has(name)) queues.set(name, [])
    }
    async add(name: string, data: Record<string, unknown>) {
      const arr = queues.get(this.name) ?? []
      arr.push({ name, data })
      queues.set(this.name, arr)
      return { id: `${Date.now()}` }
    }
    async getJobs() {
      return queues.get(this.name) ?? []
    }
    async obliterate() {
      queues.set(this.name, [])
    }
  }
  class WorkerMock {
    constructor(_name: string, _processor: unknown) {}
    on() {
      return this
    }
  }
  return { Queue: QueueMock, Worker: WorkerMock }
})
