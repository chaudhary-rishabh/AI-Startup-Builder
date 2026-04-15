import { describe, expect, it } from 'vitest'

const { createApp } = await import('../../src/app.js')

describe('health', () => {
  it('GET /health returns ok', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/health')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; service: string }
    expect(body.status).toBe('ok')
    expect(body.service).toBe('ai-service')
  })
})
