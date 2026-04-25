import { GoogleGenerativeAI } from '@google/generative-ai'

import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'

import type { Chunk } from './chunker.service.js'

export interface EnrichedChunk {
  originalText: string
  contextualPrefix: string
  enrichedText: string
  chunkIndex: number
  tokenCount: number
}

export interface EnrichmentResult {
  enrichedChunks: EnrichedChunk[]
  totalContextTokens: number
  cacheHits: number
  cacheMisses: number
  costUsd: string
}

function calculateEnrichmentCost(outputTokens: number): string {
  const outputCost = (outputTokens / 1000) * 0.0004
  return outputCost.toFixed(6)
}

const SYSTEM_TEMPLATE = (fullDocumentText: string) =>
  `<document>
${fullDocumentText}
</document>`

const USER_TEMPLATE = (chunkText: string) =>
  `Here is the chunk we want to situate within the whole document:

<chunk>
${chunkText}
</chunk>

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`

export async function enrichChunks(
  fullDocumentText: string,
  chunks: Chunk[],
  docMetadata: { filename: string; fileType: string; userId: string },
): Promise<EnrichmentResult> {
  if (!env.CONTEXT_ENRICHMENT_ENABLED) {
    return {
      enrichedChunks: chunks.map((c) => ({
        originalText: c.text,
        contextualPrefix: '',
        enrichedText: c.text,
        chunkIndex: c.chunkIndex,
        tokenCount: c.tokenCount,
      })),
      totalContextTokens: 0,
      cacheHits: 0,
      cacheMisses: 0,
      costUsd: '0.000000',
    }
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: SYSTEM_TEMPLATE(fullDocumentText),
  })

  const enrichedChunks: EnrichedChunk[] = []
  let totalContextTokens = 0

  void docMetadata

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!
    try {
      const result = await model.generateContent(USER_TEMPLATE(chunk.text))
      const contextualPrefix = result.response.text().trim()
      const outTok = Math.max(1, Math.ceil(contextualPrefix.length / 4))
      totalContextTokens += outTok

      enrichedChunks.push({
        originalText: chunk.text,
        contextualPrefix,
        enrichedText: contextualPrefix ? `${contextualPrefix}\n\n${chunk.text}` : chunk.text,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
      })
    } catch (err) {
      logger.warn('Context enrichment failed for chunk, using original', {
        chunkIndex: chunk.chunkIndex,
        error: err,
      })
      enrichedChunks.push({
        originalText: chunk.text,
        contextualPrefix: '',
        enrichedText: chunk.text,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
      })
    }

    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  const costUsd = calculateEnrichmentCost(totalContextTokens)

  return {
    enrichedChunks,
    totalContextTokens,
    cacheHits: 0,
    cacheMisses: chunks.length,
    costUsd,
  }
}
