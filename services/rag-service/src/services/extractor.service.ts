import mammoth from 'mammoth'

import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

export interface ExtractResult {
  text: string
  pageCount?: number
  wordCount: number
  extractedAt: Date
}

function isPdf(mimeType: string, filename: string): boolean {
  return mimeType.includes('pdf') || filename.toLowerCase().endsWith('.pdf')
}

function isDocx(mimeType: string, filename: string): boolean {
  return (
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
    filename.toLowerCase().endsWith('.docx')
  )
}

function isPlainText(mimeType: string, filename: string): boolean {
  const lower = filename.toLowerCase()
  return (
    mimeType.includes('text/plain') ||
    mimeType.includes('text/markdown') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md')
  )
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ExtractResult> {
  let text = ''
  let pageCount: number | undefined

  if (isPdf(mimeType, filename)) {
    try {
      const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
      const pdfDoc = await loadingTask.promise
      const textParts: string[] = []
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items
          .map((item: { str?: string }) => ('str' in item ? item.str ?? '' : ''))
          .join(' ')
        textParts.push(pageText)
      }
      text = textParts.join('\n\n')
      pageCount = pdfDoc.numPages
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new AppError('EXTRACTION_FAILED', msg, 422)
    }
  } else if (isDocx(mimeType, filename)) {
    try {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
      if (result.messages?.length) {
        logger.debug('mammoth warnings', { messages: result.messages })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new AppError('EXTRACTION_FAILED', msg, 422)
    }
  } else if (isPlainText(mimeType, filename)) {
    text = buffer.toString('utf-8')
  } else {
    throw new AppError('UNSUPPORTED_FILE_TYPE', `File type not supported: ${mimeType}`, 415)
  }

  const trimmed = text.trim()
  if (trimmed.length === 0 || trimmed.length < 50) {
    throw new AppError(
      'EXTRACTION_EMPTY',
      'Document appears to be empty or image-only. Text extraction returned no content.',
      422,
    )
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  const base = { text: trimmed, wordCount, extractedAt: new Date() }
  return pageCount !== undefined ? { ...base, pageCount } : base
}
