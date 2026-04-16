import './env-setup.js'

import Redis from 'ioredis-mock'
import { beforeEach, vi } from 'vitest'

import { getRedis, setRedisForTests } from '../src/lib/redis.js'

setRedisForTests(new Redis() as never)

beforeEach(async () => {
  await getRedis().flushall()
  queues.clear()
})

type MockJob = {
  id: string
  name: string
  data: Record<string, unknown>
  opts?: Record<string, unknown>
}

const queues = new Map<string, MockJob[]>()

vi.mock('bullmq', () => {
  class QueueMock {
    name: string
    constructor(name: string) {
      this.name = name
      if (!queues.has(name)) queues.set(name, [])
    }

    async add(name: string, data: Record<string, unknown>, opts?: Record<string, unknown>) {
      const list = queues.get(this.name) ?? []
      const job = { id: `${Date.now()}-${Math.random()}`, name, data, opts }
      list.push(job)
      queues.set(this.name, list)
      return job
    }

    async getJobs() {
      return queues.get(this.name) ?? []
    }

    async obliterate() {
      queues.set(this.name, [])
    }
  }

  class WorkerMock {
    constructor(_name: string, _processor: (job: MockJob) => Promise<void>) {}
    on() {
      return this
    }
  }

  return { Queue: QueueMock, Worker: WorkerMock }
})

vi.mock('resend', () => {
  const resendSendMock = vi.fn(async () => ({ data: { id: 're_msg_1' } }))
  ;(globalThis as unknown as { __resendSendMock: typeof resendSendMock }).__resendSendMock = resendSendMock
  class ResendMock {
    emails = {
      send: resendSendMock,
    }
    constructor(_apiKey: string) {}
  }
  return { Resend: ResendMock }
})

vi.mock('@react-email/render', () => ({
  render: vi.fn(async () => '<html>mocked</html>'),
}))
