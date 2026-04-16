import { describe, expect, it, vi, beforeEach } from 'vitest'

import { reciprocalRankFusion, RRF_K, runQueryPipeline } from '../../src/services/queryPipeline.service.js'
import type { QueryResult } from '../../src/services/pinecone.service.js'

function mkMatch(id: string, rankMeta: Partial<QueryResult['metadata']> = {}): QueryResult {
  return {
    id,
    score: 0.5,
    metadata: {
      docId: 'd1',
      userId: 'u1',
      filename: 'f.txt',
      chunkIndex: 0,
      contextualPrefix: 'ctx',
      originalText: 'orig',
      enrichedText: 'enr',
      tokenCount: 1,
      fileType: 'txt',
      ...rankMeta,
    },
  }
}

describe('reciprocalRankFusion', () => {
  it('uses RRF_K=60 in the denominator', () => {
    const dense = [mkMatch('a')]
    const bm25: QueryResult[] = []
    const m = reciprocalRankFusion(dense, bm25)
    expect(m.get('a')?.rrfScore).toBeCloseTo(1 / (RRF_K + 1), 8)
  })

  it('adds scores when chunk appears in both lists', () => {
    const x = mkMatch('x')
    const dense = [x]
    const bm25 = [x]
    const m = reciprocalRankFusion(dense, bm25)
    const combined = (1 / (RRF_K + 1)) + (1 / (RRF_K + 1))
    expect(m.get('x')?.rrfScore).toBeCloseTo(combined, 8)
  })

  it('deduplicates by id and sorts by RRF descending when converted to array', () => {
    const a = mkMatch('a')
    const b = mkMatch('b')
    const fused = reciprocalRankFusion([a], [b, a])
    const sorted = Array.from(fused.values()).sort((x, y) => y.rrfScore - x.rrfScore)
    expect(sorted[0]!.result.id).toBe('a')
  })
})

const m = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSetex: vi.fn(),
  getNamespaceStats: vi.fn(),
  embedSingleText: vi.fn(),
  queryHybrid: vi.fn(),
  rerank: vi.fn(),
}))

vi.mock('../../src/lib/redis.js', () => ({
  getRedis: () => ({
    get: m.redisGet,
    setex: m.redisSetex,
    keys: vi.fn().mockResolvedValue([]),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  }),
}))

vi.mock('../../src/db/queries/ragNamespaces.queries.js', () => ({
  getNamespaceStats: m.getNamespaceStats,
}))

vi.mock('../../src/services/embedder.service.js', () => ({
  embedSingleText: m.embedSingleText,
}))

vi.mock('../../src/services/pinecone.service.js', () => ({
  pineconeService: {
    queryHybrid: m.queryHybrid,
  },
}))

vi.mock('cohere-ai', () => ({
  CohereClient: vi.fn().mockImplementation(() => ({
    rerank: m.rerank,
  })),
}))

describe('runQueryPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.redisGet.mockResolvedValue(null)
    m.redisSetex.mockResolvedValue('OK')
    m.getNamespaceStats.mockResolvedValue({
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      pineconeNamespace: 'user_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      docCount: 2,
      totalChunks: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    m.embedSingleText.mockResolvedValue(new Array(8).fill(0.1))
    m.queryHybrid.mockImplementation(async (params: { alpha?: number }) => {
      if (params.alpha === 0.1) {
        return [mkMatch('bm', { enrichedText: 'bonly' })]
      }
      return [mkMatch('d1'), mkMatch('d2')]
    })
    m.rerank.mockResolvedValue({
      results: [
        { index: 0, relevanceScore: 0.9 },
        { index: 1, relevanceScore: 0.4 },
      ],
    })
  })

  it('returns cached result on cache hit', async () => {
    const cached = {
      chunks: [{ chunkId: 'c1', text: 't', contextualPrefix: '', originalText: 't', score: 1, docId: 'd', docName: 'n', fileType: 'txt', chunkIndex: 0 }],
      query: 'q',
      queriesUsed: ['q'],
      denseResultCount: 1,
      bm25ResultCount: 0,
      fusedResultCount: 1,
      finalResultCount: 1,
      rerankerUsed: true,
    }
    m.redisGet.mockResolvedValueOnce(JSON.stringify(cached))
    const r = await runQueryPipeline({ userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', query: 'hello there' })
    expect(r.cacheHit).toBe(true)
    expect(r.chunks).toHaveLength(1)
    expect(m.embedSingleText).not.toHaveBeenCalled()
  })

  it('returns empty when namespace has no docs', async () => {
    m.getNamespaceStats.mockResolvedValueOnce(undefined)
    const r = await runQueryPipeline({ userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', query: 'hello world' })
    expect(r.chunks).toEqual([])
    expect(r.denseResultCount).toBe(0)
  })

  it('returns empty when docCount is zero', async () => {
    m.getNamespaceStats.mockResolvedValueOnce({
      userId: 'u',
      pineconeNamespace: 'ns',
      docCount: 0,
      totalChunks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const r = await runQueryPipeline({ userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', query: 'hello world' })
    expect(r.chunks).toEqual([])
  })

  it('calls embed and Pinecone for dense and BM25 passes', async () => {
    const r = await runQueryPipeline({ userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', query: 'hello world test' })
    expect(m.embedSingleText).toHaveBeenCalled()
    expect(m.queryHybrid.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(r.denseResultCount).toBeGreaterThan(0)
    expect(r.bm25ResultCount).toBeGreaterThan(0)
    expect(r.fusedResultCount).toBeGreaterThan(0)
    expect(r.chunks.length).toBeGreaterThan(0)
  })

  it('passes filterDocIds to Pinecone', async () => {
    await runQueryPipeline({
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      query: 'filter query text here',
      filterDocIds: ['11111111-2222-3333-4444-555555555555'],
    })
    const firstCall = m.queryHybrid.mock.calls[0]![0] as { filter?: { docId: { $in: string[] } } }
    expect(firstCall.filter?.docId.$in).toEqual(['11111111-2222-3333-4444-555555555555'])
  })

  it('skips Cohere when useReranking=false', async () => {
    await runQueryPipeline({
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      query: 'no rerank query phrase',
      useReranking: false,
    })
    expect(m.rerank).not.toHaveBeenCalled()
  })

  it('falls back to RRF when Cohere rerank throws', async () => {
    m.rerank.mockRejectedValueOnce(new Error('cohere down'))
    const r = await runQueryPipeline({ userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', query: 'fallback query text' })
    expect(r.chunks.length).toBeGreaterThan(0)
    expect(r.chunks[0]?.rerankScore).toBeUndefined()
  })

  it('returns top-1 when all Cohere scores below min threshold', async () => {
    m.rerank.mockResolvedValueOnce({
      results: [
        { index: 0, relevanceScore: 0.01 },
        { index: 1, relevanceScore: 0.02 },
      ],
    })
    const r = await runQueryPipeline({
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      query: 'low score query phrase',
      minRerankScore: 0.99,
    })
    expect(r.chunks.length).toBeGreaterThanOrEqual(1)
  })

  it('caches successful results in Redis', async () => {
    await runQueryPipeline({ userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', query: 'cacheable query phrase' })
    expect(m.redisSetex).toHaveBeenCalled()
  })
})
