import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  GetObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed.example/get'),
}))

import { generateDownloadUrl, uploadExportToS3 } from '../../src/services/s3.service.js'

describe('s3.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendMock.mockResolvedValue({})
  })

  it('uploadExportToS3 sends PutObject', async () => {
    await uploadExportToS3('exports/u/p/j.zip', Buffer.from('z'), 'application/zip')
    expect(sendMock).toHaveBeenCalled()
  })

  it('generateDownloadUrl returns presigned URL', async () => {
    const url = await generateDownloadUrl('exports/u/p/j.zip')
    expect(url).toBe('https://signed.example/get')
  })
})
