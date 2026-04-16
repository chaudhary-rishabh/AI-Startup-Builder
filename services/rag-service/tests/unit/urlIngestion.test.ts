import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import * as cheerio from 'cheerio'

const m = vi.hoisted(() => ({
  findDocumentByHash: vi.fn(),
  createRagDocument: vi.fn(),
  findOrCreateNamespace: vi.fn(),
  enqueueIngestJob: vi.fn(),
  uploadToS3: vi.fn(),
}))

vi.mock('../../src/db/queries/ragDocuments.queries.js', () => ({
  findDocumentByHash: m.findDocumentByHash,
  createRagDocument: m.createRagDocument,
}))

vi.mock('../../src/db/queries/ragNamespaces.queries.js', () => ({
  findOrCreateNamespace: m.findOrCreateNamespace,
  pineconeNamespaceForUser: (userId: string) => `user_${userId.replace(/-/g, '')}`,
}))

vi.mock('../../src/queues/embed.queue.js', () => ({
  enqueueIngestJob: m.enqueueIngestJob,
}))

vi.mock('../../src/lib/s3.js', () => ({
  uploadToS3: m.uploadToS3,
}))

describe('urlIngestion helpers', () => {
  it('urlToFilename builds host-path filename', async () => {
    const { urlToFilename } = await import('../../src/services/urlIngestion.service.js')
    expect(urlToFilename('https://example.com/about/team')).toContain('example.com')
    expect(urlToFilename('https://example.com/about/team')).toMatch(/\.txt$/)
  })

  it('maxPagesForDepth returns expected caps', async () => {
    const { maxPagesForDepth } = await import('../../src/services/urlIngestion.service.js')
    expect(maxPagesForDepth(1)).toBe(0)
    expect(maxPagesForDepth(2)).toBe(20)
    expect(maxPagesForDepth(3)).toBe(100)
  })

  it('extractSameDomainLinks filters cross-domain links', async () => {
    const { extractSameDomainLinks } = await import('../../src/services/urlIngestion.service.js')
    const $ = cheerio.load(
      '<html><body><a href="/same">a</a><a href="https://other.com/x">b</a><a href="https://ex.com/y">c</a></body></html>',
    )
    const links = extractSameDomainLinks($, 'https://ex.com/page', 2)
    expect(links.every((u) => new URL(u).hostname === 'ex.com')).toBe(true)
  })

  it('maxDepth=1 extracts no linked pages', async () => {
    const { extractSameDomainLinks } = await import('../../src/services/urlIngestion.service.js')
    const $ = cheerio.load('<html><body><a href="/a">a</a></body></html>')
    expect(extractSameDomainLinks($, 'https://ex.com/', 1)).toEqual([])
  })

  it('maxDepth=2 limits same-domain links to 20', async () => {
    const { extractSameDomainLinks } = await import('../../src/services/urlIngestion.service.js')
    const links = Array.from({ length: 30 }, (_, i) => `<a href="/p${i}">x</a>`).join('')
    const $ = cheerio.load(`<html><body>${links}</body></html>`)
    const out = extractSameDomainLinks($, 'https://ex.com/start', 2)
    expect(out.length).toBeLessThanOrEqual(20)
  })
})

describe('robots and fetch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('checkRobotsTxt blocked URL throws URL_ROBOTS_BLOCKED', async () => {
    const { checkRobotsTxt } = await import('../../src/services/urlIngestion.service.js')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'User-agent: *\nDisallow: /private\n',
        headers: { get: () => null },
      }),
    )
    await expect(checkRobotsTxt('https://ex.com/private/doc')).rejects.toMatchObject({
      code: 'URL_ROBOTS_BLOCKED',
    })
  })

  it('checkRobotsTxt timeout allows through', async () => {
    const { checkRobotsTxt } = await import('../../src/services/urlIngestion.service.js')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init?: { signal?: AbortSignal }) => {
        return new Promise((_res, rej) => {
          init?.signal?.addEventListener('abort', () => rej(new Error('aborted')))
        })
      }),
    )
    await expect(checkRobotsTxt('https://timeout.example/')).resolves.toBeUndefined()
  })

  it('fetchPage returns HTML string', async () => {
    const { fetchPage } = await import('../../src/services/urlIngestion.service.js')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '<html><body>ok</body></html>',
        headers: { get: () => null },
      }),
    )
    const html = await fetchPage('https://example.com/')
    expect(html).toContain('ok')
  })
})

describe('ingestUrl', () => {
  const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

  beforeEach(() => {
    vi.clearAllMocks()
    m.findDocumentByHash.mockResolvedValue(undefined)
    m.createRagDocument.mockResolvedValue({ id: 'doc-1' })
    m.findOrCreateNamespace.mockResolvedValue(undefined)
    m.enqueueIngestJob.mockResolvedValue({ id: 'job-1' })
    m.uploadToS3.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('text shorter than 100 chars throws URL_CONTENT_TOO_SHORT', async () => {
    const { ingestUrl } = await import('../../src/services/urlIngestion.service.js')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('robots.txt')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => 'User-agent: *\nDisallow:\n',
            headers: { get: () => null },
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '<html><body><main>short</main></body></html>',
          headers: { get: () => null },
        })
      }),
    )
    await expect(ingestUrl({ url: 'https://ex.com', maxDepth: 1, userId })).rejects.toMatchObject({
      code: 'URL_CONTENT_TOO_SHORT',
    })
  })

  it('duplicate hash returns existing doc id', async () => {
    const { ingestUrl } = await import('../../src/services/urlIngestion.service.js')
    m.findDocumentByHash.mockResolvedValueOnce({ id: 'existing-1', status: 'indexed' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('robots.txt')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => 'User-agent: *\nDisallow:\n',
            headers: { get: () => null },
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            '<html><body><main>' + 'x '.repeat(80) + '</main></body></html>',
          headers: { get: () => null },
        })
      }),
    )

    const r = await ingestUrl({ url: 'https://ex.com/page', maxDepth: 1, userId })
    expect(r.docId).toBe('existing-1')
    expect(r.status).toBe('indexed')
    expect(m.createRagDocument).not.toHaveBeenCalled()
  })

  it('strips script/style/nav/footer and enqueues ingestion', async () => {
    const { ingestUrl } = await import('../../src/services/urlIngestion.service.js')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('robots.txt')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => 'User-agent: *\nDisallow:\n',
            headers: { get: () => null },
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            '<html><body><script>bad()</script><nav>menu</nav><main>' +
            'good '.repeat(60) +
            '</main><footer>x</footer></body></html>',
          headers: { get: () => null },
        })
      }),
    )

    const r = await ingestUrl({ url: 'https://ex.com/page', maxDepth: 1, userId })
    expect(r.status).toBe('queued')
    expect(m.uploadToS3).toHaveBeenCalled()
    expect(m.createRagDocument).toHaveBeenCalled()
    expect(m.enqueueIngestJob).toHaveBeenCalled()
  })
})
