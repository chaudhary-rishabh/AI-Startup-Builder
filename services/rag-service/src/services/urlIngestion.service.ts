import { createHash, randomUUID } from 'node:crypto'

import * as cheerio from 'cheerio'

import {
  createRagDocument,
  findDocumentByHash,
} from '../db/queries/ragDocuments.queries.js'
import { findOrCreateNamespace, pineconeNamespaceForUser } from '../db/queries/ragNamespaces.queries.js'
import { enqueueIngestJob } from '../queues/embed.queue.js'
import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { uploadToS3 } from '../lib/s3.js'

export interface UrlIngestInput {
  url: string
  maxDepth: number
  userId: string
  customInstructions?: string
}

export interface UrlIngestResult {
  docId: string
  url: string
  status: 'queued' | 'indexed'
  pagesFound: number
}

export function maxPagesForDepth(depth: number): number {
  if (depth >= 3) return 100
  if (depth >= 2) return 20
  return 0
}

export function urlToFilename(urlStr: string): string {
  let u: URL
  try {
    u = new URL(urlStr)
  } catch {
    return 'page.txt'
  }
  const host = u.hostname.replace(/[^a-zA-Z0-9.-]+/g, '_')
  const pathPart = u.pathname
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .slice(0, 120)
  const base = pathPart ? `${host}-${pathPart}` : host
  return `${base || 'page'}.txt`.slice(0, 200)
}

export async function checkRobotsTxt(urlStr: string): Promise<void> {
  let origin: string
  try {
    origin = new URL(urlStr).origin
  } catch {
    throw new AppError('URL_UNREACHABLE', `Invalid URL: ${urlStr}`, 422)
  }
  const robotsUrl = `${origin}/robots.txt`
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 3000)
  try {
    const res = await fetch(robotsUrl, { signal: ac.signal, redirect: 'follow' })
    clearTimeout(t)
    if (!res.ok) return
    const txt = await res.text()
    const path = new URL(urlStr).pathname || '/'
    if (isPathDisallowedByRobots(txt, path)) {
      throw new AppError('URL_ROBOTS_BLOCKED', `${urlStr} is blocked by the site's robots.txt`, 422)
    }
  } catch (e) {
    clearTimeout(t)
    if (e instanceof AppError) throw e
    return
  }
}

function isPathDisallowedByRobots(robotsTxt: string, pathname: string): boolean {
  const lines = robotsTxt.split(/\r?\n/)
  let inWildcard = false
  const disallows: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^User-agent:\s*(.+)$/i.exec(line)
    if (m) {
      inWildcard = m[1]!.trim() === '*'
      continue
    }
    if (!inWildcard) continue
    const d = /^Disallow:\s*(.*)$/i.exec(line)
    if (d) {
      const rule = d[1]!.trim()
      if (rule) disallows.push(rule)
    }
  }
  for (const rule of disallows) {
    if (pathname.startsWith(rule)) return true
  }
  return false
}

export async function fetchPage(urlStr: string): Promise<string> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 10_000)
  let current = urlStr
  for (let hop = 0; hop < 3; hop++) {
    let res: Response
    try {
      res = await fetch(current, {
        signal: ac.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'AI-Startup-Builder-RAG/1.0' },
      })
    } catch (e) {
      clearTimeout(t)
      const msg = e instanceof Error ? e.message : String(e)
      throw new AppError('URL_UNREACHABLE', `Could not fetch ${urlStr} — ${msg}`, 422)
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) break
      try {
        current = new URL(loc, current).toString()
      } catch {
        break
      }
      continue
    }
    if (!res.ok) {
      clearTimeout(t)
      throw new AppError('URL_UNREACHABLE', `Could not fetch ${urlStr} — HTTP ${res.status}`, 422)
    }
    const html = await res.text()
    clearTimeout(t)
    return html
  }
  clearTimeout(t)
  throw new AppError('URL_UNREACHABLE', `Could not fetch ${urlStr} — too many redirects`, 422)
}

export function extractSameDomainLinks(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  maxDepth: number,
): string[] {
  if (maxDepth <= 1) return []
  let baseHost: string
  try {
    baseHost = new URL(baseUrl).hostname
  } catch {
    return []
  }
  const cap = maxPagesForDepth(maxDepth)
  const seen = new Set<string>()
  const out: string[] = []
  $('a[href]').each((_, el) => {
    if (out.length >= cap) return false
    const href = $(el).attr('href')
    if (!href) return
    let abs: string
    try {
      abs = new URL(href, baseUrl).toString()
    } catch {
      return
    }
    let host: string
    try {
      host = new URL(abs).hostname
    } catch {
      return
    }
    if (host !== baseHost) return
    const norm = abs.split('#')[0]!
    if (seen.has(norm)) return
    seen.add(norm)
    out.push(norm)
    return undefined
  })
  return out
}

export async function ingestUrl(input: UrlIngestInput): Promise<UrlIngestResult> {
  await checkRobotsTxt(input.url)
  const html = await fetchPage(input.url)
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header, [role="navigation"], .cookie-banner, #cookie-consent, .ads, .advertisement').remove()
  const text = $('main, article, [role="main"], .content, .post-content, body')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length < 100) {
    throw new AppError(
      'URL_CONTENT_TOO_SHORT',
      'Page content too short to index (< 100 characters).',
      422,
    )
  }

  const contentHash = createHash('sha256').update(text).digest('hex')
  const existing = await findDocumentByHash(input.userId, contentHash)
  if (existing?.status === 'indexed') {
    return {
      docId: existing.id,
      url: input.url,
      status: 'indexed',
      pagesFound: 1,
    }
  }

  const docId = randomUUID()
  const filename = urlToFilename(input.url)
  const s3Key = `rag/${input.userId}/${docId}/${filename}`
  const buffer = Buffer.from(text, 'utf-8')
  await uploadToS3(s3Key, buffer, 'text/plain')

  await createRagDocument({
    id: docId,
    userId: input.userId,
    name: filename,
    filename,
    fileType: 'url',
    fileSizeBytes: buffer.length,
    sourceType: 'url',
    sourceUrl: input.url,
    s3Key,
    contentHash,
    status: 'pending',
    pineconeNamespace: pineconeNamespaceForUser(input.userId),
    customInstructions: input.customInstructions ?? null,
  })

  await findOrCreateNamespace(input.userId)

  await enqueueIngestJob({
    docId,
    userId: input.userId,
    s3Key,
    filename,
    fileType: 'txt',
    contentHash,
  })

  const linkedUrls = extractSameDomainLinks($, input.url, input.maxDepth)
  if (input.maxDepth > 1) {
    for (const linkedUrl of linkedUrls) {
      void ingestUrl({
        url: linkedUrl,
        maxDepth: input.maxDepth - 1,
        userId: input.userId,
        ...(input.customInstructions !== undefined
          ? { customInstructions: input.customInstructions }
          : {}),
      }).catch((err) => logger.warn('Linked URL ingestion failed', { url: linkedUrl, err }))
    }
  }

  return {
    docId,
    url: input.url,
    status: 'queued',
    pagesFound: 1 + linkedUrls.length,
  }
}
