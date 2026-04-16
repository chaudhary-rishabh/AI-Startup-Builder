import { getEncoding } from 'js-tiktoken'

import { env } from '../config/env.js'

export interface Chunk {
  text: string
  chunkIndex: number
  tokenCount: number
  charStart: number
  charEnd: number
}

export interface ChunkResult {
  chunks: Chunk[]
  totalTokens: number
  chunkCount: number
}

function approxCharPos(textLen: number, tokenPos: number, tokenLen: number): number {
  if (tokenLen <= 0) return 0
  return Math.floor((tokenPos / tokenLen) * textLen)
}

function mergeShortTail(chunks: Chunk[]): Chunk[] {
  if (chunks.length < 2) return chunks
  const last = chunks[chunks.length - 1]!
  if (last.tokenCount >= 50) return chunks
  const prev = chunks[chunks.length - 2]!
  const merged: Chunk = {
    text: `${prev.text}\n\n${last.text}`.trim(),
    chunkIndex: prev.chunkIndex,
    tokenCount: prev.tokenCount + last.tokenCount,
    charStart: prev.charStart,
    charEnd: last.charEnd,
  }
  return [...chunks.slice(0, -2), merged]
}

export function splitIntoChunks(
  text: string,
  opts?: { chunkSize?: number; overlap?: number },
): ChunkResult {
  const chunkSize = opts?.chunkSize ?? env.CHUNK_SIZE_TOKENS
  const overlap = opts?.overlap ?? env.CHUNK_OVERLAP_TOKENS

  if (!text.trim()) {
    return { chunks: [], totalTokens: 0, chunkCount: 0 }
  }

  const enc = getEncoding('cl100k_base')
  try {
    const tokens = enc.encode(text)
    if (tokens.length === 0) {
      return { chunks: [], totalTokens: 0, chunkCount: 0 }
    }

    const textLen = text.length
    const chunks: Chunk[] = []
    let start = 0
    while (start < tokens.length) {
      const end = Math.min(start + chunkSize, tokens.length)
      const chunkTokens = tokens.slice(start, end)
      const chunkText = enc.decode([...chunkTokens]).trim()
      const charStart = approxCharPos(textLen, start, tokens.length)
      const charEnd = approxCharPos(textLen, end, tokens.length)

      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          chunkIndex: chunks.length,
          tokenCount: chunkTokens.length,
          charStart,
          charEnd,
        })
      }

      if (end >= tokens.length) break
      start += chunkSize - overlap
      if (start < 0) start = 0
    }

    const merged = mergeShortTail(chunks)
    for (let i = 0; i < merged.length; i++) {
      merged[i]!.chunkIndex = i
    }

    const totalTokens = merged.reduce((s, c) => s + c.tokenCount, 0)
    return { chunks: merged, totalTokens, chunkCount: merged.length }
  } finally {
    const maybeFree = enc as unknown as { free?: () => void }
    maybeFree.free?.()
  }
}
