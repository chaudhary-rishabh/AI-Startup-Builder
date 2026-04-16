import { createHash } from 'node:crypto'

import { CohereClient } from 'cohere-ai'

import { env } from '../config/env.js'
import { getNamespaceStats } from '../db/queries/ragNamespaces.queries.js'
import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { getRedis } from '../lib/redis.js'
import { embedSingleText } from './embedder.service.js'
import { bm25EncoderService } from './bm25Encoder.service.js'
import { pineconeService } from './pinecone.service.js'

import type { QueryParams, QueryResult } from './pinecone.service.js'

export const RRF_K = 60

export interface QueryPipelineInput {
  userId: string
  query: string
  topKRetrieve?: number
  topNRerank?: number
  alpha?: number
  minRerankScore?: number
  filterDocIds?: string[]
  useReranking?: boolean
}

export interface RetrievedChunk {
  chunkId: string
  text: string
  contextualPrefix: string
  originalText: string
  score: number
  docId: string
  docName: string
  fileType: string
  chunkIndex: number
  rrfScore?: number
  rerankScore?: number
}

export interface QueryPipelineResult {
  chunks: RetrievedChunk[]
  query: string
  queriesUsed: string[]
  denseResultCount: number
  bm25ResultCount: number
  fusedResultCount: number
  finalResultCount: number
  cacheHit: boolean
  processingMs: number
  rerankerUsed: boolean
}

export function reciprocalRankFusion(
  denseResults: QueryResult[],
  bm25Results: QueryResult[],
): Map<string, { result: QueryResult; rrfScore: number }> {
  const scores = new Map<string, { result: QueryResult; rrfScore: number }>()

  denseResults.forEach((result, rank) => {
    const rrfScore = 1 / (RRF_K + rank + 1)
    const cur = scores.get(result.id)
    if (cur) {
      cur.rrfScore += rrfScore
    } else {
      scores.set(result.id, { result, rrfScore })
    }
  })

  bm25Results.forEach((result, rank) => {
    const rrfScore = 1 / (RRF_K + rank + 1)
    const cur = scores.get(result.id)
    if (cur) {
      cur.rrfScore += rrfScore
    } else {
      scores.set(result.id, { result, rrfScore })
    }
  })

  return scores
}

function metaText(m: QueryResult['metadata']): string {
  const enriched = m.enrichedText as string | undefined
  const orig = m.originalText as string | undefined
  return (enriched && enriched.length > 0 ? enriched : orig) ?? ''
}

function buildChunksFromRrf(
  fused: { result: QueryResult; rrfScore: number }[],
  topN: number,
): RetrievedChunk[] {
  return fused.slice(0, topN).map((r) => ({
    chunkId: r.result.id,
    text: metaText(r.result.metadata),
    contextualPrefix: (r.result.metadata.contextualPrefix as string) ?? '',
    originalText: (r.result.metadata.originalText as string) ?? '',
    score: r.rrfScore,
    docId: r.result.metadata.docId as string,
    docName: (r.result.metadata.filename as string) ?? '',
    fileType: (r.result.metadata.fileType as string) ?? '',
    chunkIndex: r.result.metadata.chunkIndex as number,
    rrfScore: r.rrfScore,
  }))
}

export async function runQueryPipeline(input: QueryPipelineInput): Promise<QueryPipelineResult> {
  const startTime = Date.now()
  const namespace = `user_${input.userId.replace(/-/g, '')}`
  const redis = getRedis()

  const cachePayload = input.query + JSON.stringify(input.filterDocIds ?? [])
  const cacheKey = `rag:query:${input.userId}:${createHash('sha256').update(cachePayload).digest('hex')}`

  const cached = await redis.get(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as Omit<QueryPipelineResult, 'cacheHit' | 'processingMs'>
      return {
        ...parsed,
        cacheHit: true,
        processingMs: Date.now() - startTime,
      }
    } catch {
      /* continue */
    }
  }

  const nsStats = await getNamespaceStats(input.userId)
  if (!nsStats || nsStats.docCount === 0) {
    const processingMs = Date.now() - startTime
    return {
      chunks: [],
      query: input.query,
      queriesUsed: [],
      denseResultCount: 0,
      bm25ResultCount: 0,
      fusedResultCount: 0,
      finalResultCount: 0,
      cacheHit: false,
      processingMs,
      rerankerUsed: false,
    }
  }

  const topK = input.topKRetrieve ?? env.RETRIEVAL_TOP_K
  const topN = input.topNRerank ?? env.RERANK_TOP_N
  const minScore = input.minRerankScore ?? env.RERANK_MIN_SCORE
  const useReranking = input.useReranking ?? true
  const alphaDense = input.alpha ?? env.HYBRID_ALPHA

  const pineconeFilter: Record<string, unknown> | undefined =
    input.filterDocIds && input.filterDocIds.length > 0
      ? { docId: { $in: input.filterDocIds } }
      : undefined

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedSingleText(input.query)
  } catch (e) {
    if (e instanceof AppError) throw e
    throw new AppError('EMBEDDING_FAILED', e instanceof Error ? e.message : 'Embedding failed', 502)
  }

  let denseResults: QueryResult[] = []
  try {
    const denseParams: QueryParams = {
      namespace,
      vector: queryEmbedding,
      topK,
      alpha: alphaDense,
      includeMetadata: true,
    }
    if (pineconeFilter) denseParams.filter = pineconeFilter
    denseResults = await pineconeService.queryHybrid(denseParams)
  } catch (e) {
    logger.warn('Dense Pinecone query failed', { e })
    denseResults = []
  }

  let bm25Results: QueryResult[] = []
  try {
    const querySparseVec = await bm25EncoderService.encodeQuery(input.query)

    if (querySparseVec.indices.length > 0) {
      try {
        const bm25Params: QueryParams = {
          namespace,
          vector: queryEmbedding,
          sparseVector: querySparseVec,
          topK,
          alpha: 0.1,
          includeMetadata: true,
        }
        if (pineconeFilter) bm25Params.filter = pineconeFilter
        bm25Results = await pineconeService.queryHybrid(bm25Params)
      } catch (e) {
        logger.warn('BM25 Pinecone query failed', { e })
        bm25Results = []
      }
    } else {
      logger.debug('BM25 produced empty sparse vector, using dense-only', { query: input.query })
    }
  } catch (e) {
    logger.warn('BM25 encodeQuery failed', { e })
    bm25Results = []
  }

  const fusedMap = reciprocalRankFusion(denseResults, bm25Results)
  const fusedResults = Array.from(fusedMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK)

  let finalChunks: RetrievedChunk[] = []
  const rerankerEligible = useReranking && fusedResults.length > 0

  if (!rerankerEligible) {
    finalChunks = buildChunksFromRrf(fusedResults, topN)
  } else {
    try {
      const cohere = new CohereClient({ token: env.COHERE_API_KEY })
      const documents = fusedResults.map((r) => metaText(r.result.metadata))

      const reranked = await cohere.rerank({
        model: 'rerank-english-v3.0',
        query: input.query,
        documents: documents.map((text) => ({ text })),
        topN: Math.min(topN, fusedResults.length),
        returnDocuments: false,
      })

      const results = reranked.results ?? []
      const validResults = results.filter((r) => (r.relevanceScore ?? 0) >= minScore)
      const resultSet = validResults.length > 0 ? validResults : results.slice(0, 1)

      finalChunks = resultSet.map((r) => {
        const fused = fusedResults[r.index]
        if (!fused) {
          throw new Error('rerank index out of range')
        }
        return {
          chunkId: fused.result.id,
          text: documents[r.index] ?? metaText(fused.result.metadata),
          contextualPrefix: (fused.result.metadata.contextualPrefix as string) ?? '',
          originalText: (fused.result.metadata.originalText as string) ?? '',
          score: r.relevanceScore ?? 0,
          docId: fused.result.metadata.docId as string,
          docName: (fused.result.metadata.filename as string) ?? '',
          fileType: (fused.result.metadata.fileType as string) ?? '',
          chunkIndex: fused.result.metadata.chunkIndex as number,
          rrfScore: fused.rrfScore,
          rerankScore: r.relevanceScore,
        }
      })
    } catch (err) {
      logger.warn('Cohere reranking failed, falling back to RRF results', {
        error: err,
        query: input.query,
      })
      finalChunks = buildChunksFromRrf(fusedResults, topN)
    }
  }

  const processingMs = Date.now() - startTime
  const result: QueryPipelineResult = {
    chunks: finalChunks,
    query: input.query,
    queriesUsed: [input.query],
    denseResultCount: denseResults.length,
    bm25ResultCount: bm25Results.length,
    fusedResultCount: fusedResults.length,
    finalResultCount: finalChunks.length,
    cacheHit: false,
    processingMs,
    rerankerUsed: rerankerEligible,
  }

  if (finalChunks.length > 0) {
    await redis.setex(cacheKey, env.VECTOR_CACHE_TTL_SECONDS, JSON.stringify(result))
  }

  return result
}
