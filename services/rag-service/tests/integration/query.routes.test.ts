import { randomUUID } from 'node:crypto'

import { beforeAll, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'
import { signTestAccessToken } from '../jwt.js'

const runQueryPipeline = vi.hoisted(() => vi.fn())
const getNamespaceStats = vi.hoisted(() => vi.fn())
const updateNamespaceStats = vi.hoisted(() => vi.fn())
const queryHybrid = vi.hoisted(() => vi.fn())
const deleteNamespacePinecone = vi.hoisted(() => vi.fn())
const getPineconeNsStats = vi.hoisted(() => vi.fn())

vi.mock('../../src/services/queryPipeline.service.js', () => ({
  runQueryPipeline: runQueryPipeline,
}))

vi.mock('../../src/db/queries/ragNamespaces.queries.js', () => ({
  getNamespaceStats,
  pineconeNamespaceForUser: (id: string) => `user_${String(id).replace(/-/g, '')}`,
  updateNamespaceStats,
  findOrCreateNamespace: vi.fn(),
  deleteNamespace: vi.fn(),
}))

vi.mock('../../src/services/pinecone.service.js', () => ({
  pineconeService: {
    queryHybrid,
    getNamespaceStats: getPineconeNsStats,
    deleteNamespace: deleteNamespacePinecone,
    deleteVectorsByDocId: vi.fn(),
    upsertVectors: vi.fn(),
  },
}))

describe('query routes (integration-style, mocked backends)', () => {
  let token: string
  let userId: string

  beforeAll(async () => {
    userId = randomUUID()
    token = await signTestAccessToken({ userId, plan: 'pro' })
  })

  it('POST /rag/query returns 401 without auth', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'hello world' }),
    })
    expect(res.status).toBe(401)
  })

  it('POST /rag/query returns 400 when query too short', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/rag/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'ab' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /rag/query returns 200 with chunks', async () => {
    runQueryPipeline.mockResolvedValueOnce({
      chunks: [
        {
          chunkId: 'c1',
          text: 'enriched',
          contextualPrefix: 'ctx',
          originalText: 'orig',
          score: 0.9,
          docId: 'd1',
          docName: 'f.txt',
          fileType: 'txt',
          chunkIndex: 0,
        },
      ],
      query: 'hello world there',
      queriesUsed: ['hello world there'],
      denseResultCount: 2,
      bm25ResultCount: 1,
      fusedResultCount: 2,
      finalResultCount: 1,
      cacheHit: false,
      processingMs: 12,
      rerankerUsed: true,
    })
    const app = createApp()
    const res = await app.request('http://localhost/rag/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'hello world there', topK: 3 }),
    })
    expect(res.status).toBe(200)
    const j = (await res.json()) as {
      data: { chunks: unknown[]; debug: { rerankerUsed: boolean }; cacheHit: boolean }
    }
    expect(j.data.chunks.length).toBe(1)
    expect(j.data.debug.rerankerUsed).toBe(true)
  })

  it('POST /rag/query empty namespace returns empty chunks via pipeline', async () => {
    runQueryPipeline.mockResolvedValueOnce({
      chunks: [],
      query: 'q',
      queriesUsed: [],
      denseResultCount: 0,
      bm25ResultCount: 0,
      fusedResultCount: 0,
      finalResultCount: 0,
      cacheHit: false,
      processingMs: 1,
      rerankerUsed: false,
    })
    const app = createApp()
    const res = await app.request('http://localhost/rag/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'empty namespace query' }),
    })
    expect(res.status).toBe(200)
    const j = (await res.json()) as { data: { chunks: unknown[]; totalFound: number } }
    expect(j.data.totalFound).toBe(0)
  })

  it('POST /rag/query second identical query shows cacheHit from pipeline', async () => {
    runQueryPipeline
      .mockResolvedValueOnce({
        chunks: [{ chunkId: '1', text: 't', contextualPrefix: '', originalText: 't', score: 1, docId: 'd', docName: 'n', fileType: 'txt', chunkIndex: 0 }],
        query: 'same cache query text',
        queriesUsed: ['same cache query text'],
        denseResultCount: 1,
        bm25ResultCount: 0,
        fusedResultCount: 1,
        finalResultCount: 1,
        cacheHit: false,
        processingMs: 5,
        rerankerUsed: false,
      })
      .mockResolvedValueOnce({
        chunks: [{ chunkId: '1', text: 't', contextualPrefix: '', originalText: 't', score: 1, docId: 'd', docName: 'n', fileType: 'txt', chunkIndex: 0 }],
        query: 'same cache query text',
        queriesUsed: ['same cache query text'],
        denseResultCount: 1,
        bm25ResultCount: 0,
        fusedResultCount: 1,
        finalResultCount: 1,
        cacheHit: true,
        processingMs: 1,
        rerankerUsed: false,
      })
    const app = createApp()
    const body = JSON.stringify({ query: 'same cache query text' })
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const r1 = await app.request('http://localhost/rag/query', { method: 'POST', headers: h, body })
    const r2 = await app.request('http://localhost/rag/query', { method: 'POST', headers: h, body })
    const j2 = (await r2.json()) as { data: { cacheHit: boolean } }
    expect(j2.data.cacheHit).toBe(true)
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
  })

  it('POST /rag/bm25-query returns empty when sparse is empty', async () => {
    queryHybrid.mockClear()
    const app = createApp()
    const res = await app.request('http://localhost/rag/bm25-query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '###', topK: 5 }),
    })
    expect(res.status).toBe(200)
    const j = (await res.json()) as { data: { totalFound: number } }
    expect(j.data.totalFound).toBe(0)
    expect(queryHybrid).not.toHaveBeenCalled()
  })

  it('POST /rag/bm25-query returns matches when Pinecone responds', async () => {
    queryHybrid.mockResolvedValueOnce([
      {
        id: 'id1',
        score: 0.8,
        metadata: {
          docId: 'd',
          userId,
          filename: 'f',
          chunkIndex: 0,
          contextualPrefix: '',
          originalText: 'o',
          enrichedText: 'e',
          tokenCount: 1,
          fileType: 'txt',
        },
      },
    ])
    const app = createApp()
    const res = await app.request('http://localhost/rag/bm25-query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'keyword search phrase here', topK: 5 }),
    })
    expect(res.status).toBe(200)
    const j = (await res.json()) as { data: { totalFound: number } }
    expect(j.data.totalFound).toBe(1)
  })

  it('GET /rag/namespace returns docCount', async () => {
    getNamespaceStats.mockResolvedValueOnce({
      userId,
      pineconeNamespace: `user_${userId.replace(/-/g, '')}`,
      docCount: 2,
      totalChunks: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    getPineconeNsStats.mockResolvedValueOnce({ vectorCount: 10, dimension: 3072 })
    const app = createApp()
    const res = await app.request('http://localhost/rag/namespace', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const j = (await res.json()) as { data: { docCount: number; vectorCount: number } }
    expect(j.data.docCount).toBe(2)
    expect(j.data.vectorCount).toBe(10)
  })

  it('DELETE /rag/namespace without confirm returns 400', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/rag/namespace', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

})
