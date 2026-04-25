import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('js-tiktoken', () => ({
  getEncoding: () => ({
    encode: (s: string) => new Array(Math.min(s.length, 250_000)).fill(0),
  }),
}))

vi.mock('../../src/lib/providers.js', () => ({
  geminiComplete: vi.fn().mockResolvedValue('compressed excerpt'),
  chatComplete: vi.fn(),
  streamChat: vi.fn(),
  streamChatCollect: vi.fn(),
  chatCompleteWithUsage: vi.fn(),
  minimaxClient: {},
  MINIMAX_MODEL: 'MiniMax-M2.7',
  deepseekClient: {},
  DEEPSEEK_MODEL: 'deepseek-v4-flash',
  deepseekR1Client: {},
  DEEPSEEK_R1_MODEL: 'deepseek-reasoner',
  geminiClient: {},
  GEMINI_MODEL: 'gemini-2.0-flash',
}))

import { geminiComplete } from '../../src/lib/providers.js'
import * as contextualRag from '../../src/services/contextualRag.service.js'
import * as docIntel from '../../src/services/documentIntelligence.service.js'

function ragFetch(
  list: { id: string; filename: string }[],
  texts: Record<string, string>,
  listOk = true,
): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/rag/documents?')) {
      if (!listOk) return new Response(null, { status: 503 })
      return Response.json({ documents: list })
    }
    for (const id of Object.keys(texts)) {
      if (url.includes(`/rag/documents/${encodeURIComponent(id)}/text`)) {
        return Response.json({ text: texts[id] })
      }
    }
    return new Response(null, { status: 404 })
  }) as typeof fetch
}

describe('documentIntelligence.service', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    geminiComplete.mockReset()
    geminiComplete.mockResolvedValue('compressed excerpt')
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("returns mode 'none' when user has no documents", async () => {
    global.fetch = ragFetch([], {}, true)
    const r = await docIntel.resolveDocumentContext(
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440001',
      'task',
      'prd_generator',
    )
    expect(r.mode).toBe('none')
    expect(r.content).toBe('')
    expect(r.docCount).toBe(0)
  })

  it("returns mode 'direct' when totalTokens <= 80K", async () => {
    global.fetch = ragFetch([{ id: 'd1', filename: 'readme.md' }], { d1: 'hello world' })
    const r = await docIntel.resolveDocumentContext(
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440001',
      'task',
      'prd_generator',
    )
    expect(r.mode).toBe('direct')
    expect(r.content).toContain('<user_documents>')
    expect(r.content).toContain('</user_documents>')
    expect(r.content).toContain('[Document: readme.md]')
    expect(r.wasCompressed).toBe(false)
  })

  it("returns mode 'compressed' when 80K < totalTokens <= 200K", async () => {
    const body = 'x'.repeat(50_000)
    global.fetch = ragFetch(
      [
        { id: 'a', filename: 'a.txt' },
        { id: 'b', filename: 'b.txt' },
      ],
      { a: body, b: body },
    )
    const r = await docIntel.resolveDocumentContext(
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440001',
      'build prd',
      'prd_generator',
    )
    expect(r.mode).toBe('compressed')
    expect(r.wasCompressed).toBe(true)
    expect(vi.mocked(geminiComplete)).toHaveBeenCalled()
  })

  it("returns mode 'contextual_rag' when totalTokens > 200K", async () => {
    const body = 'y'.repeat(120_000)
    global.fetch = ragFetch(
      [
        { id: 'a', filename: 'a.txt' },
        { id: 'b', filename: 'b.txt' },
      ],
      { a: body, b: body },
    )
    vi.spyOn(contextualRag, 'retrieveForAgent').mockResolvedValue({
      chunks: [],
      queriesUsed: ['q'],
      chunksRetrieved: 0,
      chunksInjected: 0,
      promptText: '<contextual_rag_results>\n</contextual_rag_results>',
    })
    const r = await docIntel.resolveDocumentContext(
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440001',
      'task',
      'prd_generator',
    )
    expect(r.mode).toBe('contextual_rag')
    expect(r.ragUsed).toBe(true)
  })

  it('returns empty content when rag-service is down (graceful)', async () => {
    global.fetch = ragFetch([], {}, false)
    const r = await docIntel.resolveDocumentContext(
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440001',
      'task',
      'prd_generator',
    )
    expect(r.mode).toBe('none')
    expect(r.content).toBe('')
  })
})
