import { Readable } from 'node:stream'

import { describe, expect, it, vi, beforeEach } from 'vitest'

const send = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send })),
  GetObjectCommand: vi.fn(),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}))

describe('s3 stream helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('downloadFromS3 reads Readable body into buffer', async () => {
    const body = Readable.from([Buffer.from('hello '), Buffer.from('world')])
    send.mockResolvedValueOnce({ Body: body })
    const { downloadFromS3 } = await import('../../src/lib/s3.js')
    const buf = await downloadFromS3('some/key')
    expect(buf.toString('utf8')).toBe('hello world')
  })

  it('downloadFromS3 accepts Uint8Array body', async () => {
    send.mockResolvedValueOnce({ Body: new Uint8Array([97, 98]) })
    const { downloadFromS3 } = await import('../../src/lib/s3.js')
    const buf = await downloadFromS3('k2')
    expect(buf.toString('utf8')).toBe('ab')
  })

  it('downloadFromS3 throws when body missing', async () => {
    send.mockResolvedValueOnce({ Body: undefined })
    const { downloadFromS3 } = await import('../../src/lib/s3.js')
    await expect(downloadFromS3('empty')).rejects.toThrow(/empty/)
  })
})
