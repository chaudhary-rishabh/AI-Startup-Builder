import { describe, expect, it, vi, afterEach } from 'vitest'

import * as cheerio from 'cheerio'

import {
  checkRobotsTxt,
  extractSameDomainLinks,
  fetchPage,
  maxPagesForDepth,
  urlToFilename,
} from '../../src/services/urlIngestion.service.js'

describe('urlIngestion helpers', () => {
  it('urlToFilename builds host-path filename', () => {
    expect(urlToFilename('https://example.com/about/team')).toContain('example.com')
    expect(urlToFilename('https://example.com/about/team')).toMatch(/\.txt$/)
  })

  it('maxPagesForDepth returns expected caps', () => {
    expect(maxPagesForDepth(1)).toBe(0)
    expect(maxPagesForDepth(2)).toBe(20)
    expect(maxPagesForDepth(3)).toBe(100)
  })

  it('extractSameDomainLinks filters cross-domain', () => {
    const $ = cheerio.load(
      '<html><body><a href="/same">a</a><a href="https://other.com/x">b</a><a href="https://ex.com/y">c</a></body></html>',
    )
    const links = extractSameDomainLinks($, 'https://ex.com/page', 2)
    expect(links.every((u) => new URL(u).hostname === 'ex.com')).toBe(true)
  })

  it('extractSameDomainLinks returns empty when maxDepth is 1', () => {
    const $ = cheerio.load('<html><body><a href="/a">a</a></body></html>')
    expect(extractSameDomainLinks($, 'https://ex.com/', 1)).toEqual([])
  })
})

describe('fetchPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns HTML string on success', async () => {
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

describe('checkRobotsTxt', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when path is disallowed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('robots.txt')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => 'User-agent: *\nDisallow: /private\n',
            headers: { get: () => null },
          })
        }
        return Promise.resolve({ ok: true })
      }),
    )
    await expect(checkRobotsTxt('https://ex.com/private/doc')).rejects.toMatchObject({
      code: 'URL_ROBOTS_BLOCKED',
    })
  })

  it('allows through when robots fetch times out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: { signal?: AbortSignal }) => {
        if (String(url).includes('robots.txt')) {
          return new Promise((_res, rej) => {
            const t = setTimeout(() => rej(new Error('aborted')), 50)
            init?.signal?.addEventListener('abort', () => {
              clearTimeout(t)
              rej(new Error('aborted'))
            })
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '<html><body>ok</body></html>',
          headers: { get: () => null },
        })
      }),
    )
    await expect(checkRobotsTxt('https://timeout.example/')).resolves.toBeUndefined()
  })
})
