import { logger } from '../lib/logger.js'

export interface SparseVector {
  indices: number[]
  values: number[]
}

const DIM = 100_000

function tokenize(text: string): string[] {
  const m = text.toLowerCase().match(/[a-z0-9']+/g)
  return m ?? []
}

function hashToIndex(term: string): number {
  let h = 0
  for (let i = 0; i < term.length; i++) {
    h = (h * 31 + term.charCodeAt(i)) >>> 0
  }
  return h % DIM
}

function toSparseVector(acc: Map<number, number>): SparseVector {
  const indices: number[] = []
  const values: number[] = []
  for (const [idx, val] of acc) {
    if (val !== 0) {
      indices.push(idx)
      values.push(val)
    }
  }
  return { indices, values }
}

export class BM25EncoderService {
  private nDocs = 0
  private avgdl = 1
  private df = new Map<string, number>()
  private fitted = false

  async fitAndEncode(texts: string[]): Promise<SparseVector[]> {
    if (texts.length === 0) return []
    try {
      this.df.clear()
      this.nDocs = texts.length
      const docLens: number[] = []
      const docTokensList: string[][] = []

      for (const t of texts) {
        const toks = tokenize(t)
        docTokensList.push(toks)
        docLens.push(toks.length)
        const seen = new Set<string>()
        for (const w of toks) {
          if (seen.has(w)) continue
          seen.add(w)
          this.df.set(w, (this.df.get(w) ?? 0) + 1)
        }
      }

      this.avgdl = docLens.reduce((a, b) => a + b, 0) / Math.max(1, this.nDocs)
      this.fitted = true

      return docTokensList.map((toks) => this.encodeTokens(toks))
    } catch (e) {
      logger.warn('BM25 fitAndEncode failed', { error: e })
      return texts.map(() => ({ indices: [], values: [] }))
    }
  }

  private idf(term: string): number {
    const df = this.df.get(term) ?? 0
    const num = this.nDocs - df + 0.5
    const den = df + 0.5
    return Math.log(1 + num / den)
  }

  private encodeTokens(tokens: string[]): SparseVector {
    const tf = new Map<string, number>()
    for (const w of tokens) {
      tf.set(w, (tf.get(w) ?? 0) + 1)
    }
    const dl = Math.max(1, tokens.length)
    const acc = new Map<number, number>()
    const k1 = 1.2
    const b = 0.75

    for (const [term, freq] of tf) {
      const idf = this.idf(term)
      const denom = freq + k1 * (1 - b + (b * dl) / this.avgdl)
      const wgt = ((freq * (k1 + 1)) / denom) * idf
      const idx = hashToIndex(term)
      acc.set(idx, (acc.get(idx) ?? 0) + wgt)
    }
    return toSparseVector(acc)
  }

  async encodeQuery(queryText: string): Promise<SparseVector> {
    if (!this.fitted) {
      logger.warn('BM25 encoder not fitted — returning empty sparse vector')
      return { indices: [], values: [] }
    }
    try {
      const toks = tokenize(queryText)
      return this.encodeTokens(toks)
    } catch (e) {
      logger.warn('BM25 encodeQuery failed', { error: e })
      return { indices: [], values: [] }
    }
  }
}

/** Default instance for query-time encoding when a corpus was fitted earlier in-process. */
export const bm25EncoderService = new BM25EncoderService()

export function createBm25EncoderForDocument(): BM25EncoderService {
  return new BM25EncoderService()
}
