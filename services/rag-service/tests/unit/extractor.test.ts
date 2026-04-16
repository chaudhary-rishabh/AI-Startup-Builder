import { describe, expect, it, vi } from 'vitest'

vi.mock('pdfjs-dist/build/pdf.mjs', () => ({
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: async () => ({
        getTextContent: async () => ({
          items: [{ str: 'Hello '.repeat(15) }],
        }),
      }),
    }),
  }),
}))

describe('extractText', () => {
  it('extracts TXT', async () => {
    const { extractText } = await import('../../src/services/extractor.service.js')
    const buf = Buffer.from('x'.repeat(60), 'utf-8')
    const r = await extractText(buf, 'text/plain', 'notes.txt')
    expect(r.text.length).toBeGreaterThanOrEqual(50)
    expect(r.wordCount).toBeGreaterThan(0)
  })

  it('extracts MD', async () => {
    const { extractText } = await import('../../src/services/extractor.service.js')
    const buf = Buffer.from('# Title\n\n' + 'word '.repeat(30), 'utf-8')
    const r = await extractText(buf, 'text/markdown', 'readme.md')
    expect(r.text.length).toBeGreaterThanOrEqual(50)
  })

  it('extracts mocked PDF', async () => {
    const { extractText } = await import('../../src/services/extractor.service.js')
    const buf = Buffer.from('%PDF-1.4', 'utf-8')
    const r = await extractText(buf, 'application/pdf', 'doc.pdf')
    expect(r.pageCount).toBe(2)
    expect(r.text.length).toBeGreaterThanOrEqual(50)
  })

  it('throws UNSUPPORTED_FILE_TYPE', async () => {
    const { extractText } = await import('../../src/services/extractor.service.js')
    await expect(extractText(Buffer.from('a'), 'application/zip', 'a.zip')).rejects.toMatchObject({
      code: 'UNSUPPORTED_FILE_TYPE',
    })
  })

  it('throws EXTRACTION_EMPTY for short text', async () => {
    const { extractText } = await import('../../src/services/extractor.service.js')
    await expect(extractText(Buffer.from('hi'), 'text/plain', 'a.txt')).rejects.toMatchObject({
      code: 'EXTRACTION_EMPTY',
    })
  })
})
