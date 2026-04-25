import { GoogleGenerativeAI } from '@google/generative-ai'

import { env } from '../config/env.js'
import { AppError } from '../lib/errors.js'

const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY)
export const EMBEDDING_MODEL = process.env['EMBEDDING_MODEL'] ?? 'text-embedding-004'

export interface EmbeddingResult {
  embeddings: number[][]
  model: string
  totalTokens: number
}

export const EMBEDDING_DIMENSIONS = env.PINECONE_EMBEDDING_DIMENSIONS
export const BATCH_SIZE = 100

function classifyEmbeddingError(err: unknown): AppError {
  const e = err as { status?: number; message?: string }
  if (e.status === 429) {
    return new AppError(
      'EMBEDDING_RATE_LIMIT',
      'Gemini embeddings rate limit hit. Retry after backoff.',
      429,
    )
  }
  if (typeof e.status === 'number' && e.status >= 500) {
    return new AppError('EMBEDDING_SERVICE_UNAVAILABLE', 'Gemini embeddings API unavailable.', 503)
  }
  return new AppError('EMBEDDING_FAILED', e.message ?? 'Embedding failed', 502)
}

function approxTokens(texts: string[]): number {
  return texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0)
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const model = gemini.getGenerativeModel({ model: EMBEDDING_MODEL })
  const out: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    try {
      const results = await Promise.all(batch.map((text) => model.embedContent(text)))
      for (const r of results) {
        const vec = r.embedding?.values
        if (!vec || vec.length === 0) {
          throw new AppError('EMBEDDING_FAILED', 'No embedding values returned', 502)
        }
        if (vec.length !== env.PINECONE_EMBEDDING_DIMENSIONS) {
          throw new AppError(
            'EMBEDDING_DIMENSION_MISMATCH',
            `Expected ${env.PINECONE_EMBEDDING_DIMENSIONS}-dim vectors (Gemini text-embedding-004 / Pinecone); got ${vec.length}`,
            502,
          )
        }
        out.push([...vec])
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      throw classifyEmbeddingError(err)
    }
  }

  return out
}

export async function embedTexts(texts: string[]): Promise<EmbeddingResult> {
  if (texts.length === 0) {
    return { embeddings: [], model: EMBEDDING_MODEL, totalTokens: 0 }
  }
  const embeddings = await embed(texts)
  return {
    embeddings,
    model: EMBEDDING_MODEL,
    totalTokens: approxTokens(texts),
  }
}

export async function embedSingleText(text: string): Promise<number[]> {
  const [first] = await embed([text])
  if (!first) throw new AppError('EMBEDDING_FAILED', 'No embedding returned', 502)
  return first
}
