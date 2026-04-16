import { randomUUID } from 'node:crypto'

import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { signTestAccessToken } from '../jwt.js'

const skip = process.env['SKIP_RAG_INTEGRATION'] === '1'

describe.skipIf(skip)('documents routes (integration)', () => {
  const userId = randomUUID()
  let token: string

  beforeAll(async () => {
    token = await signTestAccessToken({ userId, plan: 'pro' })
  })

  it('rejects without auth', async () => {
    const app = createApp()
    const res = await app.request('/rag/documents', { method: 'GET' })
    expect(res.status).toBe(401)
  })

  it('POST text document returns 202', async () => {
    const app = createApp()
    const body = new FormData()
    const content = 'word '.repeat(30)
    body.append('file', new Blob([content], { type: 'text/plain' }), 'notes.txt')
    const res = await app.request('/rag/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    })
    expect([200, 202]).toContain(res.status)
  })

  it('GET list returns documents', async () => {
    const app = createApp()
    const res = await app.request('/rag/documents?page=1&limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { documents: unknown[] } }
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data.documents)).toBe(true)
  })
})
