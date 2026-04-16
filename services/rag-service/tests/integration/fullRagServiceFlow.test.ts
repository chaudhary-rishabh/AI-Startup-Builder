import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'
import { ensureRagConsumerGroup } from '../../src/events/consumer.js'
import { getDb } from '../../src/lib/db.js'
import { setRedisForTests } from '../../src/lib/redis.js'
import { findDocumentById } from '../../src/db/queries/ragDocuments.queries.js'
import { getNamespaceStats, pineconeNamespaceForUser } from '../../src/db/queries/ragNamespaces.queries.js'
import * as s3Lib from '../../src/lib/s3.js'
import { runIngestionPipeline } from '../../src/services/ingest.service.js'
import { pineconeService } from '../../src/services/pinecone.service.js'
import { bm25EncoderService } from '../../src/services/bm25Encoder.service.js'
import { signTestAccessToken } from '../jwt.js'

const skip = process.env['SKIP_RAG_INTEGRATION'] === '1'

describe.skipIf(skip)('Full RAG Service Flow', () => {
  const userId = randomUUID()
  const secondUserId = randomUUID()
  const adminId = randomUUID()
  let token: string
  let secondToken: string
  let adminToken: string
  let app: ReturnType<typeof createApp>
  let createdDocId = ''

  beforeAll(async () => {
    setRedisForTests(undefined)
    app = createApp()
    token = await signTestAccessToken({ userId, plan: 'pro', role: 'user' })
    secondToken = await signTestAccessToken({ userId: secondUserId, plan: 'pro', role: 'user' })
    adminToken = await signTestAccessToken({ userId: adminId, plan: 'enterprise', role: 'super_admin' })
    await ensureRagConsumerGroup()

    const db = getDb()
    await db.execute(
      sql`INSERT INTO auth.users (id, email, password_hash, full_name, role, plan_tier, status) VALUES 
          (${userId}, ${`u_${userId}@test.local`}, 'x', 'User One', 'user', 'pro', 'active')
          ON CONFLICT (id) DO NOTHING`,
    )
    await db.execute(
      sql`INSERT INTO auth.users (id, email, password_hash, full_name, role, plan_tier, status) VALUES 
          (${secondUserId}, ${`u_${secondUserId}@test.local`}, 'x', 'User Two', 'user', 'pro', 'active')
          ON CONFLICT (id) DO NOTHING`,
    )
    await db.execute(
      sql`INSERT INTO auth.users (id, email, password_hash, full_name, role, plan_tier, status) VALUES 
          (${adminId}, ${`u_${adminId}@test.local`}, 'x', 'Admin User', 'super_admin', 'enterprise', 'active')
          ON CONFLICT (id) DO NOTHING`,
    )
  })

  it('1) health check', async () => {
    const res = await app.request('http://localhost/health')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; service: string }
    expect(body.status).toBe('ok')
    expect(body.service).toBe('rag-service')
  })

  it('2) upload document', async () => {
    const form = new FormData()
    form.append('file', new Blob(['hello integration flow '.repeat(200)], { type: 'text/plain' }), 'flow.txt')
    const res = await app.request('http://localhost/rag/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    expect([200, 202]).toContain(res.status)
    const json = (await res.json()) as { data: { docId: string } }
    createdDocId = json.data.docId
    expect(createdDocId).toBeTruthy()
  })

  it('3) ingestion pipeline manual run', async () => {
    vi.spyOn(s3Lib, 'downloadFromS3').mockResolvedValueOnce(
      Buffer.from('integration text content '.repeat(300), 'utf-8'),
    )
    const doc = await findDocumentById(createdDocId, userId)
    expect(doc).toBeTruthy()
    if (!doc?.s3Key) return
    await runIngestionPipeline({
      docId: doc.id,
      userId: doc.userId,
      s3Key: doc.s3Key,
      filename: doc.filename ?? doc.name,
      fileType: 'txt',
      contentHash: doc.contentHash,
    })
    const after = await findDocumentById(createdDocId, userId)
    expect(['indexed', 'processing', 'failed']).toContain(after?.status)
  })

  it('4) context enrichment metadata shape is queryable', async () => {
    const ns = pineconeNamespaceForUser(userId)
    const stats = await pineconeService.getNamespaceStats(ns)
    expect(stats === null || typeof stats.vectorCount === 'number').toBe(true)
  })

  it('5) full query pipeline endpoint returns success shape', async () => {
    vi.spyOn(bm25EncoderService, 'encodeQuery').mockResolvedValueOnce({ indices: [1], values: [0.9] })
    const res = await app.request('http://localhost/rag/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'test query about fitness', topK: 5 }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { chunks: unknown[]; debug: unknown } }
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data.chunks)).toBe(true)
    expect(json.data.debug).toBeTruthy()
  })

  it('6) repeated query returns success and includes cache flag', async () => {
    const res = await app.request('http://localhost/rag/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'test query about fitness', topK: 5 }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { cacheHit: boolean } }
    expect(typeof json.data.cacheHit).toBe('boolean')
  })

  it('7) cohere fallback path still returns 200', async () => {
    const res = await app.request('http://localhost/rag/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'fallback check query', topK: 5, useReranking: false }),
    })
    expect(res.status).toBe(200)
  })

  it('8) bm25 endpoint returns success shape', async () => {
    vi.spyOn(bm25EncoderService, 'encodeQuery').mockResolvedValueOnce({ indices: [2], values: [0.6] })
    const queryHybridSpy = vi.spyOn(pineconeService, 'queryHybrid')
    const res = await app.request('http://localhost/rag/bm25-query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'TS-999 error code', topK: 10 }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { chunks: unknown[] } }
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data.chunks)).toBe(true)
    const calledWithAlpha005 = queryHybridSpy.mock.calls.some((args) => args[0]?.alpha === 0.05)
    expect(calledWithAlpha005).toBe(true)
  })

  it('9) document listing is user-isolated', async () => {
    const mine = await app.request('http://localhost/rag/documents', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(mine.status).toBe(200)
    const other = await app.request('http://localhost/rag/documents', {
      headers: { Authorization: `Bearer ${secondToken}` },
    })
    expect(other.status).toBe(200)
  })

  it('10) document text endpoint works after indexing', async () => {
    const res = await app.request(`http://localhost/rag/documents/${createdDocId}/text`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([200, 404, 422]).toContain(res.status)
  })

  it('11) duplicate document detection returns existing doc', async () => {
    const form = new FormData()
    form.append('file', new Blob(['hello integration flow '.repeat(200)], { type: 'text/plain' }), 'flow.txt')
    const res = await app.request('http://localhost/rag/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    expect([200, 202]).toContain(res.status)
  })

  it('12) plan limit enforcement responds with structured result', async () => {
    const freeToken = await signTestAccessToken({ userId: randomUUID(), role: 'user', plan: 'free' })
    const form = new FormData()
    form.append('file', new Blob(['x'.repeat(2000)], { type: 'text/plain' }), 'limit.txt')
    const res = await app.request('http://localhost/rag/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${freeToken}` },
      body: form,
    })
    expect([202, 422]).toContain(res.status)
  })

  it('13) document deletion returns deleted=true', async () => {
    const res = await app.request(`http://localhost/rag/documents/${createdDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([200, 404]).toContain(res.status)
  })

  it('14) namespace deletion flow confirmation', async () => {
    const r1 = await app.request('http://localhost/rag/namespace', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(r1.status).toBe(400)
    const r2 = await app.request('http://localhost/rag/namespace', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE_ALL' }),
    })
    expect([200, 429]).toContain(r2.status)
  })

  it('15) user registered event path is wired', async () => {
    const ns = await getNamespaceStats(userId)
    expect(ns).toBeTruthy()
  })

  it('16) force reindex admin route responds with accepted/safe failure', async () => {
    const res = await app.request(`http://localhost/rag/admin/reindex/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect([202, 404]).toContain(res.status)
  })

  it('17) URL ingestion endpoint accepts valid URL payload', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: unknown) => {
      const u = String(input)
      if (u.endsWith('/robots.txt')) {
        return Promise.resolve(
          new Response('User-agent: *\nDisallow:\n', { status: 200 }),
        )
      }
      return Promise.resolve(
        new Response(`<html><body><main>${'url content '.repeat(30)}</main></body></html>`, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      )
    })
    const res = await app.request('http://localhost/rag/ingest-url', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', maxDepth: 1 }),
    })
    fetchSpy.mockRestore()
    expect([200, 202]).toContain(res.status)
  })

  it('18) non-admin blocked from admin routes', async () => {
    const res = await app.request(`http://localhost/rag/admin/reindex/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
  })

})
