import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(() => ({
    select: () => ({
      from: () => ({
        limit: () => Promise.resolve([{ id: 'x' }]),
      }),
    }),
  })),
}))

vi.mock('../../src/services/redis.service.js', () => ({
  getRedis: vi.fn(() => ({
    ping: () => Promise.resolve('PONG'),
  })),
}))

import { createApp } from '../../src/app.js'

describe('GET /ready', () => {
  it('returns 200 healthy when db and redis succeed', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/ready')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { status: string; db: string; redis: string }
    expect(json.status).toBe('healthy')
    expect(json.db).toBe('connected')
    expect(json.redis).toBe('connected')
  })
})
